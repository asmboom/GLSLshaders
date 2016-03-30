////////////////////////////////////////////////
/// Program: Flag Fragment Shader
/// Description: Mixes the illumination calculated from the z-position
/// and adds the color of the noise texture as a very basic bump
/// Author: Jesús Carrasco
/// Date: 17/08/2015
////////////////////////////////////////////////
///

#ifdef GS_ES
    precision highp float;
#endif

// Gamma correction
#define GAMMA (2.2)

// Varying
varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUV;
varying float vShade;
varying float vFix;

// Uniforms
uniform sampler2D textureFlag;
uniform sampler2D textureCloud;
uniform float time;
uniform float speed;
uniform float gustiness;
uniform vec4 lightPos;

float normalScale = 2.0;


vec3 ToLinear( in vec3 col )
{
	// simulate a monitor, converting colour values into light values
	return pow( col, vec3(GAMMA) );
}

vec3 ToGamma( in vec3 col )
{
	// convert back into colour values, so the correct light will come out of the monitor
	return pow( col, vec3(1.0/GAMMA) );
}


void main(){

	float s = time * speed;

    vec3 normal = normalize(vNormal);
    vec2 animUV = vUV;
    animUV.x -= s * 0.1;

    float noise = dot(texture2D(textureCloud, animUV).rgb, vec3(0.3, 0.59, 0.11));
    float noiseWB = mix(0.8, noise, gustiness);

    vec4 _color =  texture2D(textureFlag, vUV);

    vec3 lightDirection = normalize(vPosition - lightPos.xyz);
    float lambert = max(0.0, dot(-lightDirection, vNormal)) + 0.8;

    vec3 viewDirection = normalize(cameraPosition.xyz - vPosition);

    vec3 fogColor = vec3(0.0, 0.0, 0.0);

    // Putting it all together
    float NdL = max(0.0, dot(vNormal, lightDirection));

    gl_FragColor = vec4(_color.rgb * NdL, _color.a);
    
    //float NdL = max(0.0, dot(vNormal, lightDirection));
    //gl_FragColor = vec4(_color.rgb * NdL, _color.a);
}
 
