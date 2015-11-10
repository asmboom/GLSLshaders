
void main(){
	float depth = gl_FragCoord.z / gl_FragCoord.w;
    gl_FragColor = vec4(depth, 0.0, 0.0, 1.0);
}
