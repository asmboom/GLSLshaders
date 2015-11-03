#ifdef GS_ES
    precision mediump float;
#endif

//Varying
varying vec2 vUV;
varying vec3 vNormal;
varying vec3 vPos;
varying vec3 vLightPos;

uniform mat4 lightProj;
uniform mat4 lightLookAt;

void main(){
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);

    

    vec4 lightPos = lightProj * vec4(position, 1.);
    lightPos=lightLookAt*lightPos;

    //Light Camera
    vec3 lightPosDNC = lightPos.xyz/lightPos.w;

    //Export varyings
    vLightPos = vec3(0.5, 0.5, 0.5) + lightPosDNC * 0.5;
    vUV = uv;
    vPos = (modelMatrix * vec4(position, 1.)).xyz;
    vNormal = (modelMatrix * vec4(normal, 1.)).xyz;
}