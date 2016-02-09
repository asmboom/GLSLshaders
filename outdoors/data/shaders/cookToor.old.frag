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

uniform float roughnessValue;
uniform float F0;

varying float vReflectionFactor;
varying vec3 vI;
varying vec3 vWorldNormal;

#define PI 3.1415926535897932384626433832795
#define RECIPROCAL_PI 0.31830988618
#define RECIPROCAL_PI2 0.15915494

//PBR values
//
// set important material values
float k = 0.4; // fraction of diffuse reflection (specular reflection = 1 - k)
vec3 lightColor = vec3(0.9);

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

float F_Schlick( const in vec3 specularColor, const in float NdV ) {
	//return 1.0 - NdV * specularColor;
	float fresnel = 1.0 - pow(exp2( ( -5.55473 * NdV - 6.98316 ) * NdV ), F0);
	return -1.0 * fresnel + 1.0;
}



vec3 BRDF_Specular_GGX_Environment( float NdV, vec3 specularColor, float roughness ) {
	
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * NdV ) ) * r.x + r.y;
	vec2 AB = vec2( -1.04, 1.04 ) * a004 + r.zw;
	return specularColor * AB.x + AB.y;
}


float chiGGX(float v)
{
    return v > 0. ? 1. : 0.;
}

float GGX_Distribution(float NdH, float alpha)
{
    float alpha2 = alpha * alpha;
    float NoH2 = NdH * NdH;
    float den = NoH2 * alpha2 + (1. - NoH2);
    return (NdH * alpha2) / ( PI * den * den );
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

float SamplesCount = 6.;

vec3 GGX_Specular( vec3 envMap, vec3 lightDir, vec3 vNormalW, vec3 eyeDir, float roughness, float F0)
{
    vec3 reflectionVector = reflect(-eyeDir, vNormalW);
    vec3 radiance = vec3(0.);
	vec3 kS = vec3(0.);

    //Vector definition
	vec3 halfVector = normalize(lightDir + eyeDir);
	float NdL = max(0.0, dot(vNormalW, lightDir));
	float NdH = max(0.0, dot(vNormalW, halfVector));
	float NdV = max(0.0, dot(vNormalW, eyeDir));
	float VdH = max(0.0, dot(eyeDir, halfVector));
	float LdH = max(0.0, dot(lightDir, halfVector));

 	for(float i= 0.; i<=6.; i += 1.) {

    //for(float i = 0.; i < SamplesCount; ++i)    {
		
    	// Generate a sample vector in some local space
        //vec3 sampleVector = GenerateGGXsampleVector(i, SamplesCount, roughness);
        vec3 sampleVector = eyeDir;
        // Convert the vector in world space
        //sampleVector = normalize( mul( sampleVector, vViewPosition ) );

        // Calculate the half vector
        vec3 halfVector = normalize(sampleVector + eyeDir);
        float cosT = max(0.0, dot( sampleVector, vNormalW ));
        float sinT = sqrt( 1. - cosT * cosT);

        // Calculate fresnel
        vec3 fresnel = vec3(F_Schlick(vec3(0.0,0.0,0.0), clamp(NdV, 0.0, 1.0)));
        // Geometry term
        float geometry = GGX_Distribution(NdH, roughnessValue);

        // Calculate the Cook-Torrance denominator
        float denominator = max(0.0, 4.0 * (NdV * max(0.0, NdH + 0.05)));

        kS += fresnel;
        // Accumulate the radiance
        radiance += envMap.rgb * geometry * fresnel * sinT / denominator;
    }

    // Scale back for the samples count
    kS = kS / SamplesCount;
    return radiance / SamplesCount;        
}

void main(){

	vec3 lightDir = normalize(lightPos.xyz - vPos);
    vec3 eyeDir = normalize(cameraPosition - vPos);

	//Directions
    #ifdef USE_NORMAL
        vec3 vNormalW = perturbNormal2Arb(-vViewPosition, vWorldNormal);
    #else
        vec3 vNormalW = vWorldNormal;
    #endif


    //vec3 albedo = texture2D(colorMap, vUV).rgb;
    vec3 albedo = vec3(0.8, 0.8, 0.8);

 	//CUBEMAP
    vec3 reflection = reflect( vI, vWorldNormal );
    vec4 envColor = textureCube( envMap, vec3(reflection.x, reflection.yz ) );

    //Vector definition
    vec3 halfVector = normalize(lightDir + eyeDir);
    float NdL = max(0.0, dot(vNormalW, lightDir));
    float NdH = max(0.0, dot(vNormalW, halfVector));
    float NdV = max(0.0, dot(vNormalW, eyeDir));
    float VdH = max(0.0, dot(eyeDir, halfVector));
    float LdH = max(0.0, dot(lightDir, halfVector));

	 // lighting terms
    float occ = texture2D(cookedAO, vUV).r;
    float sha = shadow(clamp(NdL, 0.0, 1.0)) * NdL;
    float sun = clamp(dot(vNormalW, lightDir), 0.0, 1.0 );
    float sky = clamp(0.5 + 0.5 * vNormalW.y, 0.0, 1.0 );
    float ind = clamp(dot(vNormalW, normalize(lightDir * vec3(-1.0,0.0,-1.0))), 0.0, 1.0 );

    //Indirect lighting
    vec3 irradiance = PI * envColor.rgb;
	irradiance += PI * envColor.rgb * 1.0; //1.0 Intensity
	
	vec3 directDiffuse = irradiance * (0.31830988618 * albedo);
	vec3 indirectDiffuse = irradiance * (0.31830988618 * albedo) * occ * shadow(clamp(NdL, 0.0, 1.0)) * NdL;

    // compute lighting
    vec3 lin  = sun * vec3(envColor.rgb) * pow(vec3(sha), vec3(1.0,1.2,1.5));
         lin += sky * vec3(0.16,0.20,0.28) * occ;
         lin += ind * vec3(0.40,0.28,0.20) * occ;

	vec3 material = albedo * NdL;

    vec3 color = material * lin;

    //color += (clamp(cookTorr, 0.0, 1.0) * 0.1);

    // gamma correction
    

    float fresn = F_Schlick( vec3(0.0,0.0,0.0), clamp(NdV, 0.0, 1.0));
    // reflection        
    vec3 refl = envColor.rgb;

    vec3 ibl_reflection = textureBlured(envMap, vec3(reflection.x, reflection.yz ));

    refl = mix(refl,ibl_reflection,(1.0 - fresn) * roughnessValue);
    refl = mix(refl,ibl_reflection,roughnessValue);

    vec3 specularEnvironmentR0 = envColor.rgb;
	vec3 specularEnvironmentR90 = vec3(1.0, 1.0, 1.0);

    //Cook Torrance specular
    vec3 cookTorr = (mix(color, refl,fresn) * GGX_Distribution(NdH, roughnessValue) * roughness(NdH, halfVector, vNormalW)) / (NdV * NdL);
    
	//color += vec3(cookTorr * irradiance);
	color = pow(color, vec3(1.0/2.2) );

    gl_FragColor = vec4(color, 1.0);
}
