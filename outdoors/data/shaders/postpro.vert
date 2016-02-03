//Varying
varying vec2 vUV;

void main(){
	gl_Position = vec4(uv.x - 2.0, uv.y -2.5, 0., 1.);
	vUV=uv;
} 
 
