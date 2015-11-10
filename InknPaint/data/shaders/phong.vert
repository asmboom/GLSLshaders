#ifdef GS_ES
    precision mediump float;
#endif

#define EPSILON 1e-6

//Varying
varying vec2 vUV;
varying vec3 vNormal;
varying vec3 vPos;
varying vec3 vLightPos;
varying vec4 vShadowCoord;

uniform mat4 lightProj;
uniform mat4 Lmatrix;

void main(){
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);

    //Export varyings
    vUV = uv;
    vPos = (modelMatrix * vec4(position, 1.)).xyz;
    vNormal = (modelMatrix * vec4(normal, 1.)).xyz;

	vec4 lightPos = Lmatrix*vec4(position, 1.);
	lightPos=lightProj*lightPos;
	
	vec3 lightPosDNC=lightPos.xyz/lightPos.w;
	
	vLightPos=vec3(0.5,0.5,0.5)+lightPosDNC*0.5;

    vec4 worldPosition = Lmatrix * vec4( position, 1.0 );

    vShadowCoord = lightProj * worldPosition;
}