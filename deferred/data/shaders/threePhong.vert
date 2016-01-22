/// DEFINES
//////////////////////////////////////////////////
///

#define USE_MAP
#define PHONG

#define PI 3.14159
#define PI2 6.28318
#define RECIPROCAL_PI2 0.15915494
#define LOG2 1.442695
#define EPSILON 1e-6

#define saturate(a) clamp( a, 0.0, 1.0 )
#define whiteCompliment(a) ( 1.0 - saturate( a ) )

/// FUNCTIONS
//////////////////////////////////////////////////
///

vec3 transformDirection( in vec3 normal, in mat4 matrix ) {

	return normalize( ( matrix * vec4( normal, 0.0 ) ).xyz );

}

vec3 inverseTransformDirection( in vec3 normal, in mat4 matrix ) {

	return normalize( ( vec4( normal, 0.0 ) * matrix ).xyz );

}

vec3 projectOnPlane(in vec3 point, in vec3 pointOnPlane, in vec3 planeNormal ) {

	float distance = dot( planeNormal, point - pointOnPlane );

	return - distance * planeNormal + point;

}

float sideOfPlane( in vec3 point, in vec3 pointOnPlane, in vec3 planeNormal ) {

	return sign( dot( point - pointOnPlane, planeNormal ) );

}

vec3 linePlaneIntersect( in vec3 pointOnLine, in vec3 lineDirection, in vec3 pointOnPlane, in vec3 planeNormal ) {

	return lineDirection * ( dot( planeNormal, pointOnPlane - pointOnLine ) / dot( planeNormal, lineDirection ) ) + pointOnLine;

}

float calcLightAttenuation( float lightDistance, float cutoffDistance, float decayExponent ) {

	if ( decayExponent > 0.0 ) {

	  return pow( saturate( -lightDistance / cutoffDistance + 1.0 ), decayExponent );

	}

	return 1.0;

}

vec3 F_Schlick( in vec3 specularColor, in float dotLH ) {


	float fresnel = exp2( ( -5.55437 * dotLH - 6.98316 ) * dotLH );

	return ( 1.0 - specularColor ) * fresnel + specularColor;

}

float G_BlinnPhong_Implicit( /* in float dotNL, in float dotNV */ ) {


	return 0.25;

}

float D_BlinnPhong( in float shininess, in float dotNH ) {


	return ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );

}

vec3 BRDF_BlinnPhong( in vec3 specularColor, in float shininess, in vec3 normal, in vec3 lightDir, in vec3 viewDir ) {

	vec3 halfDir = normalize( lightDir + viewDir );

	float dotNH = saturate( dot( normal, halfDir ) );
	float dotLH = saturate( dot( lightDir, halfDir ) );

	vec3 F = F_Schlick( specularColor, dotLH );

	float G = G_BlinnPhong_Implicit( /* dotNL, dotNV */ );

	float D = D_BlinnPhong( shininess, dotNH );

	return F * G * D;

}

vec3 inputToLinear( in vec3 a ) {

	#ifdef GAMMA_INPUT

		return pow( a, vec3( float( GAMMA_FACTOR ) ) );

	#else

		return a;

	#endif

}

vec3 linearToOutput( in vec3 a ) {

	#ifdef GAMMA_OUTPUT

		return pow( a, vec3( 1.0 / float( GAMMA_FACTOR ) ) );

	#else

		return a;

	#endif

}


/*
#if defined( USE_MAP ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( USE_SPECULARMAP ) || defined( USE_ALPHAMAP ) || defined( USE_EMISSIVEMAP )

	
	uniform vec4 offsetRepeat;

#endif

#if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )

	attribute vec2 uv2;
	varying vec2 vUv2;

#endif
*/
/*
#ifdef USE_DISPLACEMENTMAP

	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;

#endif
*/
/*
#if defined( USE_ENVMAP ) && ! defined( USE_BUMPMAP ) && ! defined( USE_NORMALMAP ) && ! defined( PHONG )

	

	uniform float refractionRatio;

#endif
*/




/// VARYINGS
//////////////////////////////////////////////////
///
varying vec3 vViewPosition;
varying vec2 vUV;
varying vec3 vNormal;
varying vec3 vPos;
varying vec3 vWorldPosition;

#if MAX_SPOT_LIGHTS > 0 || defined( USE_ENVMAP )

	

#endif

#if MAX_POINT_LIGHTS > 0

	uniform vec3 pointLightPosition[ MAX_POINT_LIGHTS ];

#endif

uniform float shadowDarkness[ MAX_SHADOWS ];
uniform mat4 shadowMatrix[ MAX_SHADOWS ];
varying vec4 vShadowCoord[ MAX_SHADOWS ];



void main() {

vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

    gl_Position = projectionMatrix * mvPosition;

    vUV = uv;
    vPos = (modelMatrix * vec4(position, 1.0)).xyz;
    vNormal = (modelMatrix * vec4(normal, 0.0)).xyz;
    vec4 worldPosition = modelMatrix * vec4( position, 1.0 );

	vWorldPosition = worldPosition.xyz;

	for ( int i = 0; i < MAX_SHADOWS; i ++ ) {
		vShadowCoord[ i ] = shadowMatrix[ i ] * worldPosition;
	}

	/*
	vUv = uv;
	
	vec3 objectNormal = vec3( normal );
	vec3 transformedNormal = normalMatrix * objectNormal;
	vec3 transformed = vec3( position );
	vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );

	gl_Position = projectionMatrix * mvPosition;


	vViewPosition = - mvPosition.xyz;
	vec4 worldPosition = modelMatrix * vec4( transformed, 1.0 );

	vec3 cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
	vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );

	vWorldPosition = worldPosition.xyz;
	*/


	
}