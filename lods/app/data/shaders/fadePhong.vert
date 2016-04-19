#ifdef GS_ES
    precision mediump float;
#endif

//Varying
varying vec2 vUV;
varying vec3 vNormal;
varying vec3 vPos;

void main(){

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

    vUV = uv;
    vPos = (modelMatrix * vec4(position, 1.0)).xyz;
    vNormal = (modelMatrix * vec4(normal, 0.0)).xyz;
}
 
