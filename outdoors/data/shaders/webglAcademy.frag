precision mediump float;
uniform sampler2D sampler, samplerShadowMap;
uniform vec3 source_direction;
varying vec2 vUV;
varying vec3 vNormal, vLightPos;
const vec3 source_ambient_color=vec3(1.,1.,1.);
const vec3 source_diffuse_color=vec3(1.,1.,1.);
const vec3 mat_ambient_color=vec3(0.3,0.3,0.3);
const vec3 mat_diffuse_color=vec3(1.,1.,1.);
const float mat_shininess=10.;

void main(void) {
	vec2 uv_shadowMap=vLightPos.xy;

	//BEGIN PCF : 

	float sum=0.;
	vec2 duv;
	for(float pcf_x=-1.5; pcf_x<=1.5; pcf_x+=1.) {
		for(float pcf_y=-1.5; pcf_y<=1.5; pcf_y+=1.) {
			duv=vec2(pcf_x/512., pcf_y/512.);
			sum+=texture2D(samplerShadowMap, uv_shadowMap+duv).r;
		}
	}

	sum/=16.;

	float shadowCoeff=1.-smoothstep(0.001, 0.04, vLightPos.z-sum);

	vec3 color=vec3(texture2D(sampler, vUV));
	vec3 I_ambient=source_ambient_color*mat_ambient_color;
	vec3 I_diffuse=source_diffuse_color*mat_diffuse_color*max(0., dot(vNormal, source_direction));

	vec3 I=I_ambient+shadowCoeff*I_diffuse;
	gl_FragColor = vec4(I*color, 1.);
}