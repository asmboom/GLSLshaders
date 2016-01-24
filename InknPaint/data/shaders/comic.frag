uniform vec3 lightPos;
uniform vec4 lightDiff;
uniform vec4 matDiff;
uniform vec4 matAmbient;
uniform vec3 sceneAmbient;
uniform float shininess;
uniform int hatchesTest;

uniform sampler2D colorMap;
uniform sampler2D normalMap;
uniform sampler2D textureSpec;
uniform sampler2D matcapMap;
uniform sampler2D hatches;
uniform sampler2D maskMap;

varying vec2 vUV;
varying vec3 vNormal;
varying vec3 vPos;
varying vec3 vViewPosition;
varying vec3 vDisplaced;

uniform sampler2D shadowTexture;
uniform vec2 shadowTextureSize;
uniform float shadDarkness;
uniform float shadBias;
varying vec4 vShadowCoord;

float unpackDepth( const in vec4 rgba_depth ) {

    const vec4 bit_shift = vec4( 1.0 / ( 256.0 * 256.0 * 256.0 ), 1.0 / ( 256.0 * 256.0 ), 1.0 / 256.0, 1.0 );
    float depth = dot( rgba_depth, bit_shift );
    return depth;

}

#ifdef USE_NORMAL 

uniform float normalScale;

vec3 perturbNormal2Arb( vec3 eye_pos, vec3 surf_norm ) {
    vec3 q0 = dFdx( eye_pos.xyz );
    vec3 q1 = dFdy( eye_pos.xyz );
    vec2 st0 = dFdx( vUV.st );
    vec2 st1 = dFdy( vUV.st );

    vec3 S = normalize( q0 * st1.t - q1 * st0.t );
    vec3 T = normalize( -q0 * st1.s + q1 * st0.s );
    vec3 N = normalize( surf_norm );

    vec3 mapN = texture2D( normalMap, vUV ).xyz * 2.0 - 1.0;
    mapN.xy = normalScale * mapN.xy;
    mat3 tsn = mat3( S, T, N );
    return normalize( tsn * mapN );
}

#endif

vec2 matcapCalculation(vec3 eye, vec3 normal) {
  vec3 reflected = reflect(eye, normal);

  float m = 2.0 * sqrt(
    pow(reflected.x, 2.0) +
    pow(reflected.y, 2.0) +
    pow(reflected.z + 1.0, 2.0)
  );

  return -reflected.xy / m + 0.5;
}

vec2 rotateUV(vec2 uv ,float degree){
    float sinX = sin(degree);
    float cosX = cos(degree);
    float sinY = sin(degree);

    return uv * mat2(cosX, -sinX, sinY, cosX);
}

void main(){

    // Discard pixel calculation outside the frustum
    vec3 shadowCoord = vShadowCoord.xyz / vShadowCoord.w;

    bvec4 inFrustumVec = bvec4 ( shadowCoord.x >= 0.0, shadowCoord.x <= 1.0, shadowCoord.y >= 0.0, shadowCoord.y <= 1.0 );
    bool inFrustum = all( inFrustumVec );

    if(!inFrustum)
        discard;

    /*vec3 vPositionW = vec3(world * vec4(vPosition, 1.0));
    vec3 vNormalWorld = normalize(vec3(world * vec4(vNormal, 0.0)));
    vec3 viewDirection = normalize(cameraPosition - vPositionW);*/

    //Texture
    vec3 texColor = texture2D(colorMap, vUV).rgb;
    float specColor = texture2D(textureSpec, vUV).r;

    vec3 eyeDirection = normalize(-vPos);

    //Directions
    #ifdef USE_NORMAL
        vec3 vNormalW = perturbNormal2Arb(-vViewPosition, normalize(vNormal));
    #else
        vec3 vNormalW = normalize(vNormal);
    #endif

    vec3 lightDirection = normalize(vPos - lightPos);


    //Lambert
    float ndl = max(0., dot(-lightDirection, vNormalW));
    float halfLamb = ndl * 0.5 + 0.5;

    vec3 ambientLighting = sceneAmbient * vec3(matDiff);

    //Specular

    vec3 reflectionDirection = reflect(-lightDirection, vNormalW);

    float specLevel = max(0., dot(reflectionDirection, eyeDirection));
    specLevel = pow(specLevel, max(1., 2.)) * shininess;


    //Shadow parameters definition
    vec3 shadowMask = vec3(1.0);
    float texelSizeY =  1.0 / shadowTextureSize.y;
    float shadow = 0.0;
    float texelSizeX =  1.0 / shadowTextureSize.x;
    float shadowColor = 1.0;
    float shadowCoeff = 1.0;
    float fDepth = 1.0;
    float sum=0.;

    //RIM LIGHT
    vec3 rimLightPos = vec3(-1., -5,-15);
    vec3 rimColor = vec3(0.0);
    float rim = 0.0;

    vec3 matcapColor = vec3(1.0);
    vec3 hatchColor = vec3(1.0);
    vec3 hatchTex = vec3(1.0);


    rim = max(0.0, dot(vNormal, rimLightPos));

    if(rim > (0.01) && rim < (0.3))
        rim = 0.0;
    else{
        if (rim > 0.74)
            rimColor = vec3(1.0) * ndl;
        else{
            rim = 1.0;
        }
    }

    //// SHADOW
    //////////////////////////
    float sumCoeff = 1./64.;
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

    //// MATCAP
    //////////////////////////
    vec2 matcapUV = matcapCalculation(lightDirection, vNormalW);
    matcapColor = texture2D(matcapMap, matcapUV).rgb + 0.3;
    if(texture2D(maskMap, vUV).r < .5)
        matcapColor = matcapColor + 0.6;

    //// HATCHES
    //////////////////////////

    vec3 lightWeighting = vec3(ndl * 0.75);
    //HatchRotation

    vec3 hatchTexRot = texture2D(hatches, rotateUV(vPos.xy * 2.0, 35.)).rgb;
    vec3 hatchTexVert = texture2D(hatches, rotateUV(vPos.xy * 2.0, 120.)).rgb;
    hatchTex = texture2D(hatches,  rotateUV(vPos.xy * 2.0, -35.)).rgb;
    vec3 hatchShadow = texture2D(hatches, vPos.xy * 3.5).rgb;

    if (length(lightWeighting) < 0.7)
        hatchColor = hatchTex;


    if (length(lightWeighting) < 0.5)
        hatchColor = hatchTex * hatchTexRot;

    if( length(lightWeighting) < 0.2)
        hatchColor = hatchTex * hatchTexRot * hatchTexVert;


    if(shadowCoeff < 1.0){
        hatchColor = hatchColor * hatchShadow *  texture2D(hatches,  rotateUV(vPos.xy * 2.0, 160.)).rgb;
        shadowCoeff = 0.7;
    }

    if(shadowCoeff < 1.0 && shadowCoeff > 0.95)
        hatchColor = vec3(0.2);

    vec3 finalSpec = vec3(lightDiff) * specLevel * specColor;
    vec3 finalLight = vec3((ndl * 0.5 + 0.5) * shadowCoeff + ambientLighting) + finalSpec;

    vec3 ambient = sceneAmbient + vec3(ndl);

    vec3 color = vec3 (1.0);
    if(hatchesTest==1)
        gl_FragColor = vec4(texColor * matcapColor * ambient  * hatchColor * rim + rimColor, 1.);
    else
        gl_FragColor = vec4(texColor * matcapColor * ambient  * (1.0 - sum * 2.0), 1.);
}