///// Depth fragment
/////////////////////////
///
varying vec4 clipPos;
void main() {
	gl_FragColor = vec4( clipPos.z / clipPos.w, 1.0, 1.0, 1.0 );
};

///// Depth vertex
/////////////////////////
///

varying vec4 clipPos;

void main() {
	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
  	gl_Position = projectionMatrix * mvPosition;
   	clipPos = gl_Position;
}

///// Normals vertex
/////////////////////////
///

varying vec3 normalView;
void main() {
	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
    gl_Position = projectionMatrix * mvPosition;
    normalView = normalize( normalMatrix * normal );
}

///// Normals fragment
/////////////////////////
///

varying vec3 normalView;
void main() {
   gl_FragColor = vec4( vec3( normalView * 0.5 + 0.5 ), 1.0 );
}

///// Unlit vertex
/////////////////////////
///

varying vec4 clipPos;

void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    clipPos = gl_Position;
}

///// Unlit fragment
/////////////////////////
///
varying vec4 clipPos;
uniform sampler2D samplerDepth;
uniform float viewHeight;
uniform float viewWidth;
uniform vec3 lightColor;

void main() {
	vec2 texCoord = gl_FragCoord.xy / vec2( viewWidth, viewHeight );
	float z = texture2D( samplerDepth, texCoord ).x;
    vec4 color = vec4( lightColor, 1.0 );
    float depth = clipPos.z / clipPos.w;
    if( depth > z && z > 0.0 ) color.w = 0.0;
    	gl_FragColor = color;
}

///// Deferred vertex
/////////////////////////
///
varying vec3 lightPosVS;
varying vec3 lightNormalVS;
varying vec3 lightRightVS;

uniform vec3 lightPos;
uniform vec3 lightNormal;
uniform vec3 lightRight;
uniform mat4 matView;

void main()
{
	vec4 pos = vec4( sign( position.xy ), 0.0, 1.0 );
	gl_Position = pos;
    lightNormalVS = normalize(mat3(matView) * lightNormal);
	lightRightVS = normalize(mat3(matView) * lightRight);
    lightPosVS = vec3(matView * vec4(lightPos, 1.0));
}

///// Deferred fragment
/////////////////////////
///
varying vec3 lightPosVS;
varying vec3 lightNormalVS;
varying vec3 lightRightVS;

uniform sampler2D samplerDepth;
uniform sampler2D samplerNormals;
uniform sampler2D samplerLightBuffer;

uniform float lightWidth;
uniform float lightHeight;
uniform float lightIntensity;
uniform float lightDistance;
uniform vec3 lightColor;

uniform float viewHeight;
uniform float viewWidth;

uniform mat4 matProjInverse;

vec3 projectOnPlane(vec3 point, vec3 planeCenter, vec3 planeNorm) {
	return point - dot(point - planeCenter, planeNorm) * planeNorm;
}

bool sideOfPlane(vec3 point, vec3 planeCenter, vec3 planeNorm) {
    return (dot(point - planeCenter, planeNorm) >= 0.0);
}

vec3 linePlaneIntersect(vec3 lp, vec3 lv, vec3 pc, vec3 pn){
	return lp + lv * (dot(pn, pc - lp) / dot(pn, lv));
}

float calculateAttenuation(float dist) {
	float constAtten = 1.5;
	float linAtten = 0.5;
	float quadAtten = 0.1;
    return(1.0 / (constAtten + linAtten * dist + quadAtten * dist * dist));
}

void main() {
	vec2 texCoord = gl_FragCoord.xy / vec2(viewWidth, viewHeight);
    float z = texture2D(samplerDepth, texCoord).x;
	if(z == 0.0) {
		gl_FragColor = vec4(vec3(0.0), 1.0);
        return;
	}
    
    float x = texCoord.x * 2.0 - 1.0;
	float y = texCoord.y * 2.0 - 1.0;

	vec4 posCS = vec4(x, y, z, 1.0);

	vec4 posVS = matProjInverse * posCS;
	posVS.xyz /= posVS.w;
	posVS.w = 1.0;

	float w = lightWidth;
	float h = lightHeight;

	vec3 lightUpVS = normalize(cross(lightRightVS, lightNormalVS));
	vec3 proj = projectOnPlane(posVS.xyz, lightPosVS, lightNormalVS);
	vec3 dir = proj - lightPosVS;

	vec2 diagonal = vec2(dot(dir, lightRightVS), dot(dir, lightUpVS));
	vec2 nearest2D = vec2(clamp(diagonal.x, -w, w), clamp(diagonal.y, -h, h));
	vec3 nearestPointInside = vec3(lightPosVS) + (lightRightVS * nearest2D.x + lightUpVS * nearest2D.y);

	float dist = distance(posVS.xyz, nearestPointInside);
	float attenuation = calculateAttenuation(dist);

	vec3 lightDir = normalize(nearestPointInside - posVS.xyz);
	vec3 color = vec3(0.0);

	float NdotL = dot(lightNormalVS, -lightDir);

	if (NdotL != 0.0 && sideOfPlane(posVS.xyz, lightPosVS, lightNormalVS))
        color.xyz = vec3(lightColor * attenuation * NdotL * 1.5);
    else
        color.xyz = vec3(0.0);
    }
    
    gl_FragColor = vec4(color, 1.0);
}

///// Composite vertex
/////////////////////////
///

varying vec2 texCoord;
void main() {
	vec4 pos = vec4(sign( position.xy ), 0.0, 1.0);
	texCoord = pos.xy * vec2( 0.5 ) + 0.5;
    gl_Position = pos;
}

///// Composite fragment
/////////////////////////
///

varying vec2 texCoord;
uniform sampler2D samplerLightBuffer;
uniform sampler2D samplerNormals;
uniform sampler2D samplerDepth;
uniform sampler2D samplerEmitter;

void main() {
	vec3 color = texture2D( samplerLightBuffer, texCoord ).xyz;
	vec3 emitter = texture2D( samplerEmitter, texCoord ).xyz;

	if ( emitter != vec3( 0.0 ) ) 
		gl_FragColor = vec4( emitter, 1.0 );
	else 
        gl_FragColor = vec4( sqrt( color ), 1.0 );
	
}