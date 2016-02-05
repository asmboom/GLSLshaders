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
varying vec3 vWorldPosition;

uniform sampler2D shadowTexture;
uniform vec2 shadowTextureSize;
uniform float shadDarkness;
uniform float shadBias;

varying vec4 vShadowCoord;

uniform float GGXDistribution;
uniform float GGXGeometry;
uniform float FresnelAbsortion;
uniform float FresnelIOR;

const float PI = 3.14159;
#define RECIPROCAL_PI 0.31830988618
#define RECIPROCAL_PI2 0.15915494

//PBR values
//
// set important material values
float roughnessValue = 0.4; // 0 : smooth, 1: rough
float F0 = 2.5; // fresnel reflectance at normal incidence
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

float shadow(){
	vec3 shadowMask = vec3(1.0);

    float texelSizeY =  1.0 / shadowTextureSize.y;
    float shadow = 0.0;


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

// fresnel
float fresnel(float VdH){
    // Schlick approximation
    float fresnelTerm = pow(1.0 - VdH, 5.0);
    fresnelTerm *= (1.0 - F0);
    fresnelTerm += F0;
    return fresnelTerm;
}



float cookTorr(vec3 normal, vec3 light, vec3 view){
    //Terms
    vec3 halfVector = normalize(light + view);
    float NdL = max(0.0, dot(normal, light));
    float NdH = max(0.0, dot(normal, halfVector));
    float NdV = max(0.0, dot(normal, view));
    float VdH = max(0.0, dot(view, halfVector));

    return (fresnel(VdH) * geo(NdH, NdV, NdL, VdH) * roughness(NdH, halfVector, normal)) / (NdV * NdL * PI) * shadow();
}

void main(){

	vec3 lightDir = normalize(lightPos.xyz - vPos);
    vec3 eyeDir = normalize(cameraPosition -vPos);

	//Directions
    #ifdef USE_NORMAL
        vec3 vNormalW = perturbNormal2Arb(vViewPosition, normalize(-vNormal));
    #else
        vec3 vNormalW = normalize(vNormal);
    #endif

    vec3 albedo = texture2D(colorMap, vUV).rgb;
    float NdL = max(0., dot(vNormalW, lightDir));

    //vec3 classicLambert =  ambientLighting * albedo;

    vec3 material = albedo * NdL;

    // lighting terms
    float occ = texture2D(cookedAO, vUV).r;
    float sha = shadow() * NdL;
    float sun = clamp(dot(vNormalW, lightDir), 0.0, 1.0 );
    float sky = clamp(0.5 + 0.5 * vNormalW.y, 0.0, 1.0 );
    float ind = clamp(dot(vNormalW, normalize(lightDir * vec3(-1.0,0.0,-1.0))), 0.0, 1.0 );

    // compute lighting
    vec3 lin  = sun * vec3(1.64,1.27,0.99) * pow(vec3(sha), vec3(1.0,1.2,1.5));
         lin += sky * vec3(0.16,0.20,0.28) * occ;
         lin += ind * vec3(0.40,0.28,0.20) * occ;

    vec3 color = albedo * lin;

    vec3 outCook = color +  clamp(cookTorr(vNormalW, lightDir, eyeDir), 0.0, 1.0);

    // apply fog
    //color = doWonderfullFog( color, pos );

    // gamma correction
    outCook = pow( outCook, vec3(1.0/2.2) );


    //CUBEMAP
	vec3 cameraToVertex = normalize(vWorldPosition - cameraPosition );
	vec3 worldNormal = inverseTransformDirection(-vNormalW, viewMatrix );
	vec3 reflectVec = reflect( cameraToVertex, worldNormal );

	float flipNormal = 1.0;

	vec4 envColor = textureCube(envMap, reflect(eyeDir, -vNormalW));
	//envColor.xyz = pow(envColor.xyz, vec3(1.0/2.2));
	outCook*= envColor.rgb;

	/*vec2 sampleUV;
	sampleUV.y = max(0.0, flipNormal * reflectVec.y * 0.5 + 0.5 );
	sampleUV.x = atan( flipNormal * reflectVec.z, flipNormal * reflectVec.x ) * RECIPROCAL_PI2 + 0.5;
	vec4 envColor = texture2D( envMap, sampleUV );*/

	outCook = pow( outCook, vec3(1.0/2.2) );

    gl_FragColor = vec4(envColor.rgb, 1.);
}
