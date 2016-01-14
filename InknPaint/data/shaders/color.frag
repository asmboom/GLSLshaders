uniform sampler2D colorMap;

varying vec2 vUV;
varying vec3 vNormal;
varying vec3 vPos;

void main(){
    //Texture
    vec3 texColor = texture2D(colorMap, vUV).rgb;
    gl_FragColor = vec4(texColor, 1.);
} 
