#ifdef GS_ES
    precision mediump float;
#endif

varying vec2 vUV;
varying vec3 vNormal;
varying vec3 vPos;

uniform sampler2D texture1;
uniform sampler2D textureSpec;

uniform float near;
uniform float far;
uniform vec3 testColor;
uniform float alpha;

void main(){
    vec3 matDiff = vec3(0.7, 0.7, 0.7);
    vec3 sceneAmbient = vec3(0.26, 0.44, 0.624);

    //Depth Fog
    float depth = gl_FragCoord.z / gl_FragCoord.w;
    float fogFactor = smoothstep( 1.0, 600.0, depth );
    vec3 ambientLighting = sceneAmbient * vec3(matDiff);

    //fogFactor will act as measure distance for lods
    if(fogFactor < near){
        discard;
    }

    if(fogFactor > far){
        discard;
    }

    vec3 lightPos = vec3(350.0, -400.0, 600.0);
    vec3 lightColor = vec3(1.0, 0.964, 0.714);
   
    vec3 fogColor = vec3(0.368, 0.474, 0.59);
    float shininess = 2.0;

    //Specular Map
    vec4 texelSpecular = texture2D( textureSpec, vUV);
    float specularStrength = texelSpecular.r;

    //Directions
    vec3 vNormalW = normalize(vNormal);
    vec3 lightDirection = normalize(lightPos.xyz - vPos);

    //Textures
    vec4 texColor = texture2D(texture1, vUV);
    float specColor = texture2D(textureSpec, vUV).r;


    //Lambertian
    float ndl = max(0.0, dot(lightDirection, vNormal));

    //Speck
    vec3 viewDirectionW = normalize(cameraPosition - vPos);
    vec3 reflectionDirection = reflect(-lightDirection, vNormalW);
    float specLevel = max(0.0, dot(reflectionDirection, viewDirectionW));
    specLevel = pow(specLevel, max(1., 8.)) * shininess;

    vec3 finalSpec = vec3(lightColor) * specLevel * specColor;
    vec3 finalLight = (lightColor.xyz * ndl) + ambientLighting;


    //gl_FragColor = mix (vec4(finalLight * texColor.rgb + finalSpec * testColor, alpha), vec4(fogColor, gl_FragColor.w ), fogFactor );
    gl_FragColor = vec4(testColor, 1.0);
    
    
}