//Varying
varying vec2 vUV;

void main(){
	
	gl_Position = vec4(position.x * uv.x * 2.0 - 1.0, position.y * uv.y * 2.0 - 1.0, 0., 1.);
	vUV=uv;

} 
 
