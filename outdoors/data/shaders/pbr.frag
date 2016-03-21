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

varying float vReflectionFactor;
varying vec3 vI;
varying vec3 vWorldNormal;

const float PI = 3.1415926535897932384626433832795;
#define RECIPROCAL_PI 0.31830988618
#define RECIPROCAL_PI2 0.15915494

float g_lillum = 0.8;

// Linear/Gama Correction
////////////////////////////////////
//
vec3 toLinear(vec3 color) {
    return pow(color, vec3(2.2));
}

vec3 toGamma(vec3 color) {
     return pow(color, vec3(1.0 / 2.2));
}

// BRDF Variable definition
////////////////////////////////////
//
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

// Normal map perturbance
///////////////////////////////////
//
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

// Shadow map integration
///////////////////////////////////
//

float unpackDepth( const in vec4 rgba_depth ) {
    const vec4 bit_shift = vec4( 1.0 / ( 256.0 * 256.0 * 256.0 ), 1.0 / ( 256.0 * 256.0 ), 1.0 / 256.0, 1.0 );
    float depth = dot( rgba_depth, bit_shift );
    return depth;
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

// Environment texture blur
///////////////////////////////////
//


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

float calcDistrScalar(BRDFVars bvars)
{
    // D(h) factor
    // using the GGX approximation where the gamma factor is 2.

    // Clamping roughness so that a directional light has a specular
    // response.  A roughness of perfectly 0 will create light
    // singularities.
    float alpha = roughnessValue * roughnessValue;
    float denom = bvars.NdH* bvars.NdH* (alpha*alpha - 1.) + 1.;
    float D = (alpha*alpha)/(PI * denom*denom);

    // using the GTR approximation where the gamma factor is generalized
    //float gamma = 1.;
    //float sinth = length(cross(surf.normal, bvars.hdir));
    //float D = 1./pow(alpha*alpha*bvars.costh*bvars.costh + sinth*sinth, gamma);

    return D;
}

float calcGeomScalar(BRDFVars bvars, float roughness)
{

    // G(h,l,v) factor
    float k = roughness / 2.;
    float Gv = step(0., bvars.NdV) * (bvars.NdV/(bvars.NdV * (1. - k) + k));
    float Gl = step(0., bvars.NdL) * (bvars.NdL/(bvars.NdL * (1. - k) + k));

    return Gl * Gv;
}


vec3 calcFresnelColor(BRDFVars bvars, vec3 albedo)
{
    // F(h,l) factor
    vec3 F0 = .8 * mix(vec3(1.), albedo, metalness);

    vec3 F = F0 + (1. - F0) * exp2((-5.55473 * bvars.LdH - 6.98316) * bvars.LdH);
    //vec3 F = F0 + (1. - F0) * pow5(1. - bvars.LdH);


    return F;
}

vec3 integrateDirLight(BRDFVars bvars, vec3 albedo, vec3 ibl_reflection)
{


    vec3 cout = vec3(0.);
    float ndl = clamp(bvars.NdL, 0., 1.);

    if (ndl > 0.)
    {
        vec3 diff = albedo * bvars.NdL;

        // remap hotness of roughness for analytic lights
        float D = calcDistrScalar(bvars);
        float G = calcGeomScalar(bvars, (roughnessValue + 1.) * .5);
        vec3 F  = calcFresnelColor(bvars, albedo);

        vec3 spec = D * F * G / (4. * bvars.NdL * bvars.NdV);

        float shd = shadow(bvars.NdL);

        cout  += spec * ndl * shd * ibl_reflection; //lightcolor;
    }

    return cout;
}


vec3 sampleEnvLight(BRDFVars bvars, vec3 lcolor, vec3 albedo)
{

    float ndl = clamp(bvars.NdL, 0., 1.);

    vec3 cout = vec3(0.);

    if (ndl > 0.)
    {

        float D = calcDistrScalar(bvars);
        float G = calcGeomScalar(bvars, roughnessValue);
        vec3 F  = calcFresnelColor(bvars, albedo);

        // Combines the BRDF as well as the pdf of this particular
        // sample direction.
        vec3 spec = lcolor * G * F * bvars.LdH / (bvars.NdH * bvars.NdV);

        float shd = shadow(bvars.NdL);

        cout = spec * shd * lcolor;
    }

    return cout;
}

vec3 integrateEnvLight(BRDFVars bvars, vec3 tint, vec3 albedo)
{
    //CUBEMAP
    vec3 reflection = reflect( vI, vWorldNormal );
    vec3 envColor = toLinear(textureCube( envMap, vec3(reflection.x, reflection.yz ) ).rgb);
    vec3 ibl_reflection = toLinear(textureBlured(envMap, vec3(reflection.x, reflection.yz )));

    vec3 specolor = .4 * mix(envColor,
                             ibl_reflection,
                             roughnessValue) * (1. - roughnessValue);

    vec3 envspec = sampleEnvLight(bvars, ibl_reflection * specolor, albedo);
    return clamp(envspec, 0.0, 1.0);
}

void main(){

    //Directions
    vec3 lightDir = normalize(lightPos.xyz - vPos);
    vec3 eyeDir = normalize(cameraPosition - vPos);

    #ifdef USE_NORMAL
        vec3 vNormalW = perturbNormal2Arb(vViewPosition, vWorldNormal);
    #else
        vec3 vNormalW = vWorldNormal;
    #endif

    BRDFVars bvars = calcBRDFVars( vWorldNormal, lightDir, eyeDir);

    vec3 amb = toLinear(texture2D(colorMap, vUV).rgb) * 0.2;

    float ao = texture2D(cookedAO, vUV).r;

    vec3 reflection = reflect( vI, vWorldNormal );
    vec3 cout = integrateDirLight(bvars, amb, toLinear(textureBlured(envMap, vec3(reflection.x, reflection.yz ))));
    cout += integrateEnvLight(bvars, vec3(0.8), amb) *  ao;
    cout += amb * ao;
    /*
    // ambient occlusion is amount of occlusion.  So 1 is fully occluded
    // and 0 is not occluded at all.  Makes math easier when mixing
    // shadowing effects.
    ;

    vec3 cout   = integrateDirLight(g_ldir, vec3(g_lillum), surf);
    cout       += integrateEnvLight(surf, vec3(g_lillum)) * (1. - 3.5 * ao);
    cout       += amb * (1. - 3.5 * ao);*/

    gl_FragColor  = vec4(toGamma(cout),1.0);
}