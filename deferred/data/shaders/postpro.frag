uniform sampler2D colorMap;
uniform sampler2D normalMap;
uniform sampler2D positionMap;
uniform sampler2D depthMap;
uniform sampler2D shadowMap;
uniform vec3 lightPos;
varying vec2 vUV;


void main(){
    //Texture
    vec3 texColor = texture2D(colorMap, vUV).rgb;
    vec3 texNormal = texture2D(normalMap, vUV).rgb;
    vec3 texPos = texture2D(positionMap, vUV).rgb;
    vec3 texDepth = texture2D(depthMap, vUV).rgb;
    vec3 texShadow = texture2D(shadowMap, vUV).rgb;

//    gl_FragColor = vec4(texColor, 1.);
    
    vec3 lightDir = lightPos - texPos.xyz ;
    
    texNormal = normalize(texNormal);
    lightDir = normalize(lightDir);
    
    vec3 eyeDir = normalize(cameraPosition-texPos.xyz);
    vec3 vHalfVector = normalize(lightDir.xyz + eyeDir);

    float ndl = max(0., dot(texNormal,lightDir));
    vec3 outColor = texColor * max(0.3, texShadow.r);
    float halfNormal = pow(max(0., dot(texNormal,vHalfVector)), 100.) * 1.5;
    gl_FragColor = vec4(outColor + vec3(halfNormal * 0.1 * texShadow), 1.0);
}
 
