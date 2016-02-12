uniform vec4 lightPos;
uniform vec4 lightDiff;
uniform vec4 matDiff;
uniform vec4 matAmbient;
uniform vec3 sceneAmbient;
uniform float shininess;

uniform sampler2D colorMap;
uniform sampler2D normalMap;
uniform sampler2D textureSpec;
uniform sampler2D cookedAO;
uniform samplerCube envMap;
uniform sampler2D roughnessMap;
uniform sampler2D metalMap;

varying vec2 vUV;
varying vec3 vNormal;
varying vec3 vPos;
varying vec3 vViewPosition;

uniform sampler2D shadowTexture;
uniform vec2 shadowTextureSize;
uniform float shadDarkness;
uniform float shadBias;

varying vec4 vShadowCoord;

uniform float F0;
uniform float roughnessValue;
uniform float fresnelTerm;
uniform float u_time;

varying float vReflectionFactor;
varying vec3 vI;
varying vec3 vWorldNormal;

const float PI = 3.1415926535897932384626433832795;
#define RECIPROCAL_PI 0.31830988618
#define RECIPROCAL_PI2 0.15915494

float unpackDepth( const in vec4 rgba_depth ) {
    const vec4 bit_shift = vec4( 1.0 / ( 256.0 * 256.0 * 256.0 ), 1.0 / ( 256.0 * 256.0 ), 1.0 / 256.0, 1.0 );
    float depth = dot( rgba_depth, bit_shift );
    return depth;
}

#ifdef USE_NORMAL 

vec3 perturbNormal2Arb( vec3 eye_pos, vec3 surf_norm ) {
    vec3 q0 = dFdx( eye_pos.xyz );
    vec3 q1 = dFdy( eye_pos.xyz );
    vec2 st0 = dFdx( vUV.st );
    vec2 st1 = dFdy( vUV.st );

    vec3 S = normalize( q0 * st1.t - q1 * st0.t );
    vec3 T = normalize( -q0 * st1.s + q1 * st0.s );
    vec3 N = normalize( surf_norm );

    vec3 mapN = texture2D(normalMap, vUV).xyz * 2.0 - 1.0;
    mapN.xy = vec2(1.0) * mapN.xy;
    mat3 tsn = mat3( S, T, N );
    return normalize( tsn * mapN );
}

#endif

float shadow(float NdL){
    vec3 shadowMask = vec3(1.0);

    float texelSizeY =  1.0 / shadowTextureSize.y;
    float shadow = 0.0;

    float bias = shadBias * tan(acos(NdL)); // cosTheta is dot( n,l ), clamped between 0 and 1
    bias = clamp(bias, 0.0 ,0.01);

    float texelSizeX =  1.0 / shadowTextureSize.x;

    vec3 shadowCoord = vShadowCoord.xyz / vShadowCoord.w;

    bvec4 inFrustumVec = bvec4 ( shadowCoord.x >= 0.0, shadowCoord.x <= 1.0, shadowCoord.y >= 0.0, shadowCoord.y <= 1.0 );
    bool inFrustum = all( inFrustumVec );

    bvec2 frustumTestVec = bvec2( inFrustum, shadowCoord.z <= 1.0 );

    bool frustumTest = all( frustumTestVec );

    float shadowColor = 1.0;

    float shadowCoeff = 1.0;

    float fDepth = 1.0;
    float sum=0.;

    if ( frustumTest ) {

        float sumCoeff = 1./8.;
        vec2 duv;
        for(float pcf_x=-1.5; pcf_x<=1.5; pcf_x += 1.) {
            for(float pcf_y=-1.5; pcf_y<=1.5; pcf_y += 1.) {
                duv=vec2(pcf_x/shadowTextureSize.x, pcf_y/shadowTextureSize.y);
                fDepth = unpackDepth(texture2D(shadowTexture, shadowCoord.xy + duv));
                if (fDepth < shadowCoord.z + shadBias)
                    sum += sumCoeff;
            }
        }

        shadowCoeff = 1.0 - sum * shadDarkness;
    }

    return max(0.0, shadowCoeff);
}

float somestep(float t) {
    return pow(t,4.0);
}

vec3 textureAVG(samplerCube tex, vec3 tc) {
    const float diff0 = 0.35;
    const float diff1 = 0.12;
    vec3 s0 = pow(textureCube(tex,tc).xyz, vec3(2.2));
    vec3 s1 = pow(textureCube(tex,tc+vec3(diff0)).xyz, vec3(2.2));
    vec3 s2 = pow(textureCube(tex,tc+vec3(-diff0)).xyz, vec3(2.2));
    vec3 s3 = pow(textureCube(tex,tc+vec3(-diff0,diff0,-diff0)).xyz, vec3(2.2));
    vec3 s4 = pow(textureCube(tex,tc+vec3(diff0,-diff0,diff0)).xyz, vec3(2.2));
    
    vec3 s5 = pow(textureCube(tex,tc+vec3(diff1)).xyz, vec3(2.2));
    vec3 s6 = pow(textureCube(tex,tc+vec3(-diff1)).xyz, vec3(2.2));
    vec3 s7 = pow(textureCube(tex,tc+vec3(-diff1,diff1,-diff1)).xyz, vec3(2.2));
    vec3 s8 = pow(textureCube(tex,tc+vec3(diff1,-diff1,diff1)).xyz, vec3(2.2));
    
    return (s0 + s1 + s2 + s3 + s4 + s5 + s6 + s7 + s8) * 0.111111111;
}



float random(vec3 scale, float seed) {
    return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);
}

vec2 RandomSamples(float seed) {
    float u = random(vec3(12.9898, 78.233, 151.7182), seed);
    float v = random(vec3(63.7264, 10.873, 623.6736), seed);
    return vec2(u, v);
}

vec3 ImportanceSampleGGX( vec2 Xi, float Roughness, vec3 N ) {
    float a = Roughness * Roughness;
    float Phi = 2.0 * PI * Xi.x;
    float CosTheta = sqrt( (1.0 - Xi.y) / ( 1.0 + (a*a - 1.0) * Xi.y ) );
    float SinTheta = sqrt( 1.0 - CosTheta * CosTheta );
    vec3 H;
    H.x = SinTheta * cos( Phi );
    H.y = SinTheta * sin( Phi );
    H.z = CosTheta;
    return H;
}

vec3 textureBlured(samplerCube tex, vec3 tc) {
    vec3 r = textureAVG(tex,vec3(1.0,0.0,0.0));
    vec3 t = textureAVG(tex,vec3(0.0,1.0,0.0));
    vec3 f = textureAVG(tex,vec3(0.0,0.0,1.0));
    vec3 l = textureAVG(tex,vec3(-1.0,0.0,0.0));
    vec3 b = textureAVG(tex,vec3(0.0,-1.0,0.0));
    vec3 a = textureAVG(tex,vec3(0.0,0.0,-1.0));
        
    float kr = dot(tc,vec3(1.0,0.0,0.0)) * 0.5 + 0.5; 
    float kt = dot(tc,vec3(0.0,1.0,0.0)) * 0.5 + 0.5;
    float kf = dot(tc,vec3(0.0,0.0,1.0)) * 0.5 + 0.5;
    float kl = 1.0 - kr;
    float kb = 1.0 - kt;
    float ka = 1.0 - kf;
    
    kr = somestep(kr);
    kt = somestep(kt);
    kf = somestep(kf);
    kl = somestep(kl);
    kb = somestep(kb);
    ka = somestep(ka);    
    
    float d;
    vec3 ret;
    ret  = f * kf; d  = kf;
    ret += a * ka; d += ka;
    ret += l * kl; d += kl;
    ret += r * kr; d += kr;
    ret += t * kt; d += kt;
    ret += b * kb; d += kb;
    
    return ret / d;
}

float phong(vec3 l, vec3 e, vec3 n, float power) {
    float nrm = (power + 8.0) / (PI * 8.0);
    return pow(max(dot(l,reflect(e,n)),0.0), power) * nrm;
}


// roughness (or: microfacet distribution function)
float roughness(float NdH, vec3 halfVector, vec3 normal){
    float mSquared = roughnessValue * roughnessValue;
    // beckmann distribution function
    
    float r1 = 1.0 / ( 4.0 * mSquared * pow(NdH, 4.0));
    float r2 = (NdH * NdH - 1.0) / (mSquared * NdH * NdH);
    return r1 * exp(r2);
}

float geo(float NdH, float NdV, float NdL, float VdH){
    // geometric attenuation
    float NH2 = 2.0 * NdH;
    float g1 = (NH2 * NdV) / VdH;
    float g2 = (NH2 * NdL) / VdH;
    return min(1.0, min(g1, g2));
}

float F(float LdH) {
    float powTerm = (-5.55473 * LdH - 6.98316) * LdH;
    return F0 + (1.0 - F0) * pow(2.0, powTerm);
}


// From Microfacet Models for Refraction through Rough Surfaces, Walter et al. 2007
float smithVisibilityG1_TrowbridgeReitzGGX(float dot, float alphaG){
    float tanSquared = (1.0 - dot * dot) / (dot * dot);
    return 2.0 / (1.0 + sqrt(1.0 + alphaG * alphaG * tanSquared));
}

float smithVisibilityG_TrowbridgeReitzGGX_Walter(float NdotL, float NdotV, float alphaG){
    return smithVisibilityG1_TrowbridgeReitzGGX(NdotL, alphaG) * smithVisibilityG1_TrowbridgeReitzGGX(NdotV, alphaG);
}

// Trowbridge-Reitz (GGX)
// Generalised Trowbridge-Reitz with gamma power=2.0
float normalDistributionFunction_TrowbridgeReitzGGX(float NdotH, float alphaG){
    // Note: alphaG is average slope (gradient) of the normals in slope-space.
    // It is also the (trigonometric) tangent of the median distribution value, i.e. 50% of normals have
    // a tangent (gradient) closer to the macrosurface than this slope.
    float a2 = sqrt(alphaG);
    float d = NdotH * NdotH * (a2 - 1.0) + 1.0;
    return a2 / (PI * d * d);
}

vec3 FresnelSchlickEnvironmentGGX(float VdotN, vec3 reflectance0, vec3 reflectance90, float smoothness)
{
    // Schlick fresnel approximation, extended with basic smoothness term so that rough surfaces do not approach reflectance90 at grazing angle
    float weight = mix(0.25, 1.0, smoothness);
    return clamp(reflectance0 + weight * (reflectance90 - reflectance0) * pow(clamp(1.0 - VdotN, 0., 1.), 5.0), 0.0, 1.0);
}

vec3 specularTerm(vec3 normal, vec3 light, vec3 view, vec3 envMap, vec3 ibl_reflection){
    //Terms
    vec3 halfVector = normalize(light + view);
    float NdL = max(0.0, dot(normal, light));
    float NdH = max(0.0, dot(normal, halfVector));
    float NdV = max(0.0, dot(normal, view));
    float VdH = max(0.0, dot(view, halfVector));
    float LdH = max(0.0, dot(light, halfVector));

    vec3 SpecularLighting = vec3(0.0);

    if( NdL > 0.0 )
    {
        float fresnel = max(1.0 - NdV, 0.0);
        fresnel = pow(fresnel, sqrt(roughnessValue));    

        vec3 fresnel_fn = FresnelSchlickEnvironmentGGX(NdV, ibl_reflection, envMap, sqrt(roughnessValue));
        float distribution = normalDistributionFunction_TrowbridgeReitzGGX(NdH, roughnessValue);
        float geometry = smithVisibilityG_TrowbridgeReitzGGX_Walter(NdL, NdV, sqrt(roughnessValue)) / (4.0 * NdL * NdV);

        float specTerm = max(0., geometry * distribution) * NdL;
        return fresnel_fn * specTerm * PI; // TODO: audit pi constants
    }

    return SpecularLighting;
}

float computeDiffuseTerm(vec3 normal, vec3 light, vec3 view)
{
    //Terms
    vec3 halfVector = normalize(light + view);
    float NdL = max(0.0, dot(normal, light));
    float NdH = max(0.0, dot(normal, halfVector));
    float NdV = max(0.0, dot(normal, view));
    float VdH = max(0.0, dot(view, halfVector));
    float LdH = max(0.0, dot(light, halfVector));

    // Diffuse fresnel falloff as per Disney principled BRDF, and in the spirit of
    // of general coupled diffuse/specular models e.g. Ashikhmin Shirley.
    float diffuseFresnelNV = pow(clamp(1.0 - NdL, 0.000001, 1.), 5.0);
    float diffuseFresnelNL = pow(clamp(1.0 - NdV, 0.000001, 1.), 5.0);
    float diffuseFresnel90 = 0.5 + 2.0 * VdH * VdH * roughnessValue;
    float diffuseFresnelTerm =
        (1.0 + (diffuseFresnel90 - 1.0) * diffuseFresnelNL) *
        (1.0 + (diffuseFresnel90 - 1.0) * diffuseFresnelNV);


    return diffuseFresnelTerm * NdL;
}

void main(){

    vec3 eyeDir = normalize(cameraPosition - vPos);
    vec3 lightDir = normalize(lightPos.xyz - vPos);

    //Directions
    #ifdef USE_NORMAL
        vec3 vNormalW = perturbNormal2Arb(vViewPosition, vWorldNormal);
    #else
        vec3 vNormalW = vWorldNormal;
    #endif

    vec3 albedo = texture2D(colorMap, vUV).rgb;
    
    //CUBEMAP
    vec3 reflection = reflect( vI, vWorldNormal );

    // IBL
    vec3 ibl_diffuse = textureBlured(envMap, vNormalW);
    vec3 ibl_reflection = textureBlured(envMap, vec3(reflection.x, reflection.yz ));

     // fresnel
    float fresnel = max(1.0 - dot(vNormalW, eyeDir), 0.0);
    fresnel = pow(fresnel, fresnelTerm);    

    // reflection        
    vec3 envColor = pow(textureCube(envMap, vec3(reflection.x, reflection.yz )).rgb, vec3(2.2));

    vec3 refl = mix(envColor, ibl_reflection, (1.0 - fresnel) * roughnessValue);
    refl = mix(ibl_reflection, refl, fresnel * roughnessValue);

    float NdL = max(0.0, dot(vNormalW, lightDir));
    vec3 irradiance = NdL * PI * ibl_reflection;

    vec3 directDiffuse = irradiance * RECIPROCAL_PI * albedo;
    vec3 indirectDiffse = ibl_reflection * RECIPROCAL_PI * albedo;
    //TODO: Añadir Cook-Toorance
    //specular
    float power = 1.0 / max(roughnessValue * 0.4, 0.01);
    vec3 spec = (envColor * 1.2) * phong(lightDir, eyeDir, vNormalW, power);
    refl -= spec;

    float diffuseTerm = computeDiffuseTerm(vNormalW, lightDir, eyeDir);
    // diffuse
    vec3 diff = ibl_reflection;
    diff += mix(diff * albedo * diffuseTerm, refl * albedo, fresnel);  


    
    vec3 color = pow(diff * albedo, vec3(1.0/2.2));

    vec3 cookT = specularTerm(vNormalW, lightDir, eyeDir, envColor, ibl_reflection) * refl;

    gl_FragColor = vec4(directDiffuse + indirectDiffse, 1.0);
}
