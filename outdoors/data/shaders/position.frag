varying vec2 vUV;
varying vec3 vNormal;
varying vec3 vPos;

void main(){
    //Texture
    gl_FragColor = vec4(vPos, 1.);
} 
