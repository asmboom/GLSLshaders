uniform sampler2D colorMap;
varying vec2 vUV;

void main(){
    //Texture
    vec3 texColor = texture2D(colorMap, vUV).rgb;
    gl_FragColor = vec4(vec3(1.,.0,.0), 1.);
} 
 
