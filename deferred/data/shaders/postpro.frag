uniform sampler2D colorMap;
uniform sampler2D normalMap;
uniform sampler2D positionMap;
uniform sampler2D depthMap;
varying vec2 vUV;


void main(){
    //Texture
    vec3 texColor = texture2D(colorMap, vUV).rgb;
    vec3 texNormal = texture2D(normalMap, vUV).rgb;
    vec3 texPos = texture2D(positionMap, vUV).rgb;
    vec3 texDepth = texture2D(depthMap, vUV).rgb;

//    gl_FragColor = vec4(texColor, 1.);
    
    vec3 light = vec3(50,100,50);
    vec3 lightDir = light - texPos.xyz ;
    
    texNormal = normalize(texNormal);
    lightDir = normalize(lightDir);
    
    vec3 eyeDir = normalize(cameraPosition-texPos.xyz);
    vec3 vHalfVector = normalize(lightDir.xyz + eyeDir);

    float ndl = max(0., dot(texNormal,lightDir));
    vec3 outColor = texColor * ndl;
    float halfNormal = pow(max(0., dot(texNormal,vHalfVector)), 100.) * 1.5;
    gl_FragColor = vec4(outColor + vec3(halfNormal), 1.0);
    //gl_FragColor = max(dot(texNormal,lightDir),0) * texColor + pow(max(dot(texNormal,vHalfVector),0.0), 100) * 1.5;
} 
 
