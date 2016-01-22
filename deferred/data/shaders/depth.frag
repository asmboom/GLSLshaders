varying vec4 resultPos;

void main(){
	//float depth = gl_FragCoord.z / gl_FragCoord.w;
	float depth = resultPos.z / resultPos.w;
    gl_FragColor = vec4(depth, 1.0, 1.0, 1.0);
}
