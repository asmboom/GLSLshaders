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

varying vec2 vUV;
varying vec3 vNormal;
varying vec3 vPos;
varying vec3 vViewPosition;

uniform sampler2D shadowTexture;
uniform vec2 shadowTextureSize;
uniform float shadDarkness;
uniform float shadBias;

varying vec4 vShadowCoord;

uniform float metalness;
uniform float roughnessValue;
uniform float fresnelTerm;
uniform float u_time;

varying float vReflectionFactor;
varying vec3 vI;
varying vec3 vWorldNormal;

const float PI = 3.1415926535897932384626433832795;
#define RECIPROCAL_PI 0.31830988618
#define RECIPROCAL_PI2 0.15915494

//PBR values
//
// set important material values
//float roughnessValue = 0.4; // 0 : smooth, 1: rough
//float F0 = 2.5; // fresnel reflectance at normal incidence
float k = 0.4; // fraction of diffuse reflection (specular reflection = 1 - k)
vec3 lightColor = vec3(0.9);


vec3 toLinear(vec3 color) {
    return pow(color, vec3(2.2));
}

vec3 toGamma(vec3 color) {
     return pow(color, vec3(1.0 / 2.2));
}

struct BRDFVars
{
    // The half vector of a microfacet model
    vec3 halfVector;
    // cos(theta_h) - theta_h is angle between half vector and normal
    float NdH;
    // cos(theta_d) - theta_d is angle between half vector and light dir/view dir
    float LdH;
    // cos(theta_l) - theta_l is angle between the light vector and normal
    float NdL;
    // cos(theta_v) - theta_v is angle between the viewing vector and normal
    float NdV;
    float VdH;

};

BRDFVars calcBRDFVars(vec3 normal, vec3 ldir, vec3 vdir)
{
    vec3 halfVector = normalize(ldir + vdir);

    float NdH = max(0.0, dot(normal, halfVector));
    float LdH = max(0.0, dot(ldir, halfVector));
    float NdL = max(0.0, dot(ldir, normal));
    float NdV = max(0.0, dot(normal, vdir));
    float VdH = max(0.0, dot(vdir, halfVector));


    // Diffuse fresnel falloff as per Disney principled BRDF, and in the spirit of
    // of general coupled diffuse/specular models e.g. Ashikhmin Shirley.
    float diffuseFresnelNV = pow(clamp(1.0 - NdL, 0.000001, 1.), 5.0);
    float diffuseFresnelNL = pow(clamp(1.0 - NdV, 0.000001, 1.), 5.0);
    float diffuseFresnel90 = 0.5 + 2.0 * VdH * VdH * roughnessValue;
    float diffuseFresnelTerm =
        (1.0 + (diffuseFresnel90 - 1.0) * diffuseFresnelNL) *
        (1.0 + (diffuseFresnel90 - 1.0) * diffuseFresnelNV);


    NdL = diffuseFresnelTerm * NdL;

    return BRDFVars(halfVector, NdH, LdH, NdL, NdV, VdH);
}


vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}


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

float getValue(vec3 color){
    return dot(color, vec3(0.3, 0.59, 0.11));
}

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

        float occ = texture2D(cookedAO, vUV).r;

        shadowCoeff = 1.0 - sum;
    }

    return max(0.0, shadowCoeff);
}

// roughness (or: microfacet distribution function)
float roughness(BRDFVars bvars){
    float mSquared = roughnessValue * roughnessValue;
    // beckmann distribution function
    
    float r1 = 1.0 / ( 4.0 * mSquared * pow(bvars.NdH, 4.0));
    float r2 = (bvars.NdH * bvars.NdH - 1.0) / (mSquared * bvars.NdH * bvars.NdH);
    return r1 * exp(r2);
}

float geo(BRDFVars bvars){
    // geometric attenuation
    float NH2 = 2.0 * bvars.NdH;
    float g1 = (NH2 * bvars.NdV) / bvars.VdH;
    float g2 = (NH2 * bvars.NdL) / bvars.VdH;
    return min(1.0, min(g1, g2));
}

float F(BRDFVars bvars) {
	float powTerm = (-5.55473 * bvars.LdH - 6.98316) * bvars.LdH;
	return metalness + (1.0 - metalness) * pow(2.0, powTerm);
}

vec3 cookTorr(BRDFVars bvars){

    //Terms
    vec3 SpecularLighting = vec3(0.0);

	if( bvars.NdL > 0.0 )
	{
        float fresnel_fn = F(bvars);
        float ndf_fn = roughness(bvars);
        float g_fn = geo(bvars);

        float denominator = max(0.0, 4. * (bvars.NdV * bvars.NdH) + 0.05);
        SpecularLighting += fresnel_fn * ndf_fn * g_fn / denominator;
	}

	return vec3(SpecularLighting);
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

vec3 specularTerm(BRDFVars bvars, vec3 envMap, vec3 reflectionColor){

    vec3 SpecularLighting = vec3(0.0);

    if( bvars.NdL > 0.0 )
    {
        vec3 fresnel_fn = FresnelSchlickEnvironmentGGX(bvars.NdV, reflectionColor, envMap, sqrt(roughnessValue));
        float distribution = normalDistributionFunction_TrowbridgeReitzGGX(bvars.NdH, roughnessValue);
        float geometry = smithVisibilityG_TrowbridgeReitzGGX_Walter(bvars.NdL, bvars.NdV, sqrt(roughnessValue)) / (4.0 * bvars.NdL * bvars.NdV);

        float specTerm = max(0., geometry * distribution) * bvars.NdL;
        return fresnel_fn * specTerm * PI; // TODO: audit pi constants
    }

    return SpecularLighting * reflectionColor;
}

float somestep(float t) {
    return pow(t,4.0);
}

vec3 textureAVG(samplerCube tex, vec3 tc) {
    const float diff0 = 0.35;
    const float diff1 = 0.12;
 	vec3 s0 = textureCube(tex,tc).xyz;
    vec3 s1 = textureCube(tex,tc+vec3(diff0)).xyz;
    vec3 s2 = textureCube(tex,tc+vec3(-diff0)).xyz;
    vec3 s3 = textureCube(tex,tc+vec3(-diff0,diff0,-diff0)).xyz;
    vec3 s4 = textureCube(tex,tc+vec3(diff0,-diff0,diff0)).xyz;
    
    vec3 s5 = textureCube(tex,tc+vec3(diff1)).xyz;
    vec3 s6 = textureCube(tex,tc+vec3(-diff1)).xyz;
    vec3 s7 = textureCube(tex,tc+vec3(-diff1,diff1,-diff1)).xyz;
    vec3 s8 = textureCube(tex,tc+vec3(diff1,-diff1,diff1)).xyz;
    
    return (s0 + s1 + s2 + s3 + s4 + s5 + s6 + s7 + s8) * 0.111111111;
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


void main(){

	vec3 lightDir = normalize(lightPos.xyz - vPos);
    vec3 eyeDir = normalize(cameraPosition - vPos);

	//Directions
    #ifdef USE_NORMAL
        vec3 vNormalW = perturbNormal2Arb(vViewPosition, vWorldNormal);
    #else
        vec3 vNormalW = vWorldNormal;
    #endif

    BRDFVars bvars = calcBRDFVars( vWorldNormal, lightDir, eyeDir);

    vec3 albedo = toLinear(texture2D(colorMap, vUV).rgb);

    // TODO: apply fog
    //color = doWonderfullFog( color, pos );

    //CUBEMAP
    vec3 reflection = reflect( vI, vWorldNormal );
    vec3 envColor = toLinear(textureCube( envMap, vec3(reflection.x, reflection.yz ) ).rgb);

	 // lighting terms
    float occ = texture2D(cookedAO, vUV).r;
    float sha = shadow(bvars.NdL) * bvars.NdL;
    float sun = bvars.NdL;
    float sky = clamp(0.5 + 0.5 * vNormalW.y, 0.0, 1.0 );
    float ind = clamp(bvars.NdL, 0.0, 1.0 );

     // reflection
    vec3 refl =  envColor;
    vec3 ibl_reflection = textureBlured(envMap, vec3(reflection.x, reflection.yz ));

    refl = mix(ibl_reflection, refl, vReflectionFactor);

    //compute lighting
    /*vec3 lin  = sun * refl * pow(vec3(sha), vec3(1.0,1.2,1.5));
         lin += sky * refl * occ;
         lin += ind * vec3(0.40,0.28,0.20) * occ;*/

    //vec3 outCook = specularTerm(bvars, envColor, ibl_reflection);
    vec3 outCook =  cookTorr(bvars);

    /*vec3 cout  = outCook * sha;
            cout += ibl_reflection * occ;
            cout += albedo * occ * sha;*/

    vec3 cout  = sun * ibl_reflection * pow(vec3(sha), vec3(1.0,1.2,1.5));
         cout += sky * refl * occ;
         cout += ind * vec3(0.40,0.28,0.20) * occ;
         cout += albedo * occ * sha;

    vec3 metalout = outCook * sha;
        metalout += refl * occ;

    cout = mix(cout, metalout, metalness);
    gl_FragColor = vec4(cout, 1.0);
}
