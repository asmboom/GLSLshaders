#ifdef GS_ES
    precision mediump float;
#endif

uniform vec4 lightPos;
uniform vec4 lightDiff;
uniform vec4 matDiff;
uniform vec4 matAmbient;
uniform vec3 sceneAmbient;
uniform float shininess;

uniform sampler2D texture;
uniform sampler2D textureSpec;


varying vec2 vUV;
varying vec3 vNormal;
varying vec3 vPos;

//Shadow texture parameters
uniform sampler2D shadowTexture;
varying vec4 vShadowCoord;

varying vec3 vLightPos;

float unpackDepth( const in vec4 rgba_depth ) {
    const vec4 bit_shift = vec4( 1.0 / ( 256.0 * 256.0 * 256.0 ), 1.0 / ( 256.0 * 256.0 ), 1.0 / 256.0, 1.0 );
    float depth = dot( rgba_depth, bit_shift );
    return depth;
}

void main(){
    //Texture
    vec3 texColor = texture2D(texture, vUV).rgb;
    float specColor = texture2D(textureSpec, vUV).r;


    //Directions
    vec3 vNormalW = normalize(vNormal);
    vec3 lightDirection = normalize(vPos - lightPos.xyz);

    //Lambert
    float ndl = max(0., dot(-lightDirection, vNormalW));

    vec3 ambientLighting = sceneAmbient * vec3(matDiff);

    //Specular
    vec3 eyeDirection = normalize(-vPos);
    vec3 reflectionDirection = reflect(-lightDirection, vNormal);

    vec4 shadowMap = texture2D(shadowTexture, vLightPos.xy);
    float fDepth = unpackDepth( shadowMap );

    float specLevel = max(0., dot(reflectionDirection, eyeDirection));

    specLevel = pow(specLevel, max(1., 2.)) * shininess;

    vec3 finalSpec = vec3(lightDiff) * specLevel * specColor;

    vec3 finalLight = vec3(lightDiff) * ndl + ambientLighting + finalSpec;

    //gl_FragColor = vec4(finalLight * texColor, 1.);
    
    gl_FragColor = vec4(shadowMap.rgb + 0.1, 1.);

}