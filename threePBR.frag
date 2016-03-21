#extension GL_OES_standard_derivatives : enable
precision highp float;
precision highp int;
#define SHADER_NAME ShaderMaterial
#define STANDARD 1
#define ALPHATEST 0.0
#define GAMMA_FACTOR 2
uniform mat4 viewMatrix;
uniform vec3 cameraPosition;

varying vec3 vViewPosition;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#define PI 3.14159
#define PI2 6.28318
#define RECIPROCAL_PI 0.31830988618
#define RECIPROCAL_PI2 0.15915494
#define LOG2 1.442695
#define EPSILON 1e-6
#define saturate(a) clamp( a, 0.0, 1.0 )
#define whiteCompliment(a) ( 1.0 - saturate( a ) )
float square( const in float x ) { return x*x; }
float average( const in vec3 color ) { return dot( color, vec3( 0.3333 ) ); }
struct IncidentLight {
	vec3 color;
	vec3 direction;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
struct GeometricContext {
	vec3 position;
	vec3 normal;
	vec3 viewDir;
};
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
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

#ifdef USE_FOG
	uniform vec3 fogColor;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif
float calcLightAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	if ( decayExponent > 0.0 ) {
	  return pow( saturate( -lightDistance / cutoffDistance + 1.0 ), decayExponent );
	}
	return 1.0;
}
vec3 BRDF_Diffuse_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 specularColor, const in float dotLH ) {
	float fresnel = exp2( ( -5.55473 * dotLH - 6.98316 ) * dotLH );
	return ( 1.0 - specularColor ) * fresnel + specularColor;
}
float G_GGX_Smith( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = alpha * alpha;
	float gl = dotNL + pow( a2 + ( 1.0 - a2 ) * dotNL * dotNL, 0.5 );
	float gv = dotNV + pow( a2 + ( 1.0 - a2 ) * dotNV * dotNV, 0.5 );
	return 1.0 / ( gl * gv );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = alpha * alpha;
	float denom = dotNH * dotNH * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / ( denom * denom );
}
vec3 BRDF_Specular_GGX( const in IncidentLight incidentLight, const in GeometricContext geometry, const in vec3 specularColor, const in float roughness ) {
	float alpha = roughness * roughness;
	vec3 halfDir = normalize( incidentLight.direction + geometry.viewDir );
	float dotNL = saturate( dot( geometry.normal, incidentLight.direction ) );
	float dotNV = saturate( dot( geometry.normal, geometry.viewDir ) );
	float dotNH = saturate( dot( geometry.normal, halfDir ) );
	float dotLH = saturate( dot( incidentLight.direction, halfDir ) );
	vec3 F = F_Schlick( specularColor, dotLH );
	float G = G_GGX_Smith( alpha, dotNL, dotNV );
	float D = D_GGX( alpha, dotNH );
	return F * ( G * D );
}
vec3 BRDF_Specular_GGX_Environment( const in GeometricContext geometry, const in vec3 specularColor, const in float roughness ) {
	float dotNV = saturate( dot( geometry.normal, geometry.viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 AB = vec2( -1.04, 1.04 ) * a004 + r.zw;
	return specularColor * AB.x + AB.y;
}
float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_Specular_BlinnPhong( const in IncidentLight incidentLight, const in GeometricContext geometry, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( incidentLight.direction + geometry.viewDir );
	float dotNH = saturate( dot( geometry.normal, halfDir ) );
	float dotLH = saturate( dot( incidentLight.direction, halfDir ) );
	vec3 F = F_Schlick( specularColor, dotLH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
}
float GGXRoughnessToBlinnExponent( const in float ggxRoughness ) {
	return ( 2.0 / square( ggxRoughness + 0.0001 ) - 2.0 );
}
uniform vec3 ambientLightColor;
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	return PI * ambientLightColor;
}

#if 2 > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
		int shadow;
		float shadowBias;
		float shadowRadius;
		vec2 shadowMapSize;
	};
	uniform DirectionalLight directionalLights[ 2 ];
	IncidentLight getDirectionalDirectLight( const in DirectionalLight directionalLight, const in GeometricContext geometry ) {
		IncidentLight directLight;
		directLight.color = directionalLight.color;
		directLight.direction = directionalLight.direction;
		return directLight;
	}
#endif
#if 0 > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
		int shadow;
		float shadowBias;
		float shadowRadius;
		vec2 shadowMapSize;
	};
	uniform PointLight pointLights[ 0 ];
	IncidentLight getPointDirectLight( const in PointLight pointLight, const in GeometricContext geometry ) {
		IncidentLight directLight;
		vec3 lVector = pointLight.position - geometry.position;
		directLight.direction = normalize( lVector );
		directLight.color = pointLight.color;
		directLight.color *= calcLightAttenuation( length( lVector ), pointLight.distance, pointLight.decay );
		return directLight;
	}
#endif
#if 0 > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float angleCos;
		float exponent;
		int shadow;
		float shadowBias;
		float shadowRadius;
		vec2 shadowMapSize;
	};
	uniform SpotLight spotLights[ 0 ];
	IncidentLight getSpotDirectLight( const in SpotLight spotLight, const in GeometricContext geometry ) {
		IncidentLight directLight;
		vec3 lVector = spotLight.position - geometry.position;
		directLight.direction = normalize( lVector );
		float spotEffect = dot( directLight.direction, spotLight.direction );
		if ( spotEffect > spotLight.angleCos ) {
			float spotEffect = dot( spotLight.direction, directLight.direction );
			spotEffect = saturate( pow( saturate( spotEffect ), spotLight.exponent ) );
			directLight.color = spotLight.color;
			directLight.color *= ( spotEffect * calcLightAttenuation( length( lVector ), spotLight.distance, spotLight.decay ) );
		} else {
			directLight.color = vec3( 0.0 );
		}
		return directLight;
	}
#endif
#if 0 > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ 0 ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in GeometricContext geometry ) {
		float dotNL = dot( geometry.normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		return PI * mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
	}
#endif
#if defined( USE_ENVMAP ) && defined( STANDARD )
	vec3 getLightProbeIndirectIrradiance( const in GeometricContext geometry, const in int maxMIPLevel ) {
		#ifdef DOUBLE_SIDED
			float flipNormal = ( float( gl_FrontFacing ) * 2.0 - 1.0 );
		#else
			float flipNormal = 1.0;
		#endif
		vec3 worldNormal = inverseTransformDirection( geometry.normal, viewMatrix );
		#ifdef ENVMAP_TYPE_CUBE
			vec3 queryVec = flipNormal * vec3( flipEnvMap * worldNormal.x, worldNormal.yz );
			#ifdef TEXTURE_LOD_EXT
				vec4 envMapColor = textureCubeLodEXT( envMap, queryVec, float( maxMIPLevel ) );
			#else
				vec4 envMapColor = textureCube( envMap, queryVec, float( maxMIPLevel ) );
			#endif
		#else
			vec3 envMapColor = vec3( 0.0 );
		#endif
		envMapColor.rgb = inputToLinear( envMapColor.rgb );
		return PI * envMapColor.rgb * envMapIntensity;
	}
	float getSpecularMIPLevel( const in float blinnShininessExponent, const in int maxMIPLevel ) {
		float maxMIPLevelScalar = float( maxMIPLevel );
		float desiredMIPLevel = maxMIPLevelScalar - 0.79248 - 0.5 * log2( square( blinnShininessExponent ) + 1.0 );
		return clamp( desiredMIPLevel, 0.0, maxMIPLevelScalar );
	}
	vec3 getLightProbeIndirectRadiance( const in GeometricContext geometry, const in float blinnShininessExponent, const in int maxMIPLevel ) {
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( -geometry.viewDir, geometry.normal );
		#else
			vec3 reflectVec = refract( -geometry.viewDir, geometry.normal, refractionRatio );
		#endif
		#ifdef DOUBLE_SIDED
			float flipNormal = ( float( gl_FrontFacing ) * 2.0 - 1.0 );
		#else
			float flipNormal = 1.0;
		#endif
		reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
		float specularMIPLevel = getSpecularMIPLevel( blinnShininessExponent, maxMIPLevel );
		#ifdef ENVMAP_TYPE_CUBE
			vec3 queryReflectVec = flipNormal * vec3( flipEnvMap * reflectVec.x, reflectVec.yz );
			#ifdef TEXTURE_LOD_EXT
				vec4 envMapColor = textureCubeLodEXT( envMap, queryReflectVec, specularMIPLevel );
			#else
				vec4 envMapColor = textureCube( envMap, queryReflectVec, specularMIPLevel );
			#endif
		#elif defined( ENVMAP_TYPE_EQUIREC )
			vec2 sampleUV;
			sampleUV.y = saturate( flipNormal * reflectVec.y * 0.5 + 0.5 );
			sampleUV.x = atan( flipNormal * reflectVec.z, flipNormal * reflectVec.x ) * RECIPROCAL_PI2 + 0.5;
			#ifdef TEXTURE_LOD_EXT
				vec4 envMapColor = texture2DLodEXT( envMap, sampleUV, specularMIPLevel );
			#else
				vec4 envMapColor = texture2D( envMap, sampleUV, specularMIPLevel );
			#endif
		#elif defined( ENVMAP_TYPE_SPHERE )
			vec3 reflectView = flipNormal * normalize((viewMatrix * vec4( reflectVec, 0.0 )).xyz + vec3(0.0,0.0,1.0));
			#ifdef TEXTURE_LOD_EXT
				vec4 envMapColor = texture2DLodEXT( envMap, reflectView.xy * 0.5 + 0.5, specularMIPLevel );
			#else
				vec4 envMapColor = texture2D( envMap, reflectView.xy * 0.5 + 0.5, specularMIPLevel );
			#endif
		#endif
		envMapColor.rgb = inputToLinear( envMapColor.rgb );
		return envMapColor.rgb * envMapIntensity;
	}
#endif

struct StandardMaterial {
	vec3	diffuseColor;
	float	specularRoughness;
	vec3	specularColor;
};

void RE_Direct_Standard( const in IncidentLight directLight, const in GeometricContext geometry, const in StandardMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometry.normal, directLight.direction ) );
	vec3 irradiance = dotNL * PI * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Diffuse_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_Specular_GGX( directLight, geometry, material.specularColor, material.specularRoughness );
}

void RE_IndirectDiffuse_Standard( const in vec3 irradiance, const in GeometricContext geometry, const in StandardMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Diffuse_Lambert( material.diffuseColor );
}

void RE_IndirectSpecular_Standard( const in vec3 radiance, const in GeometricContext geometry, const in StandardMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectSpecular += radiance * BRDF_Specular_GGX_Environment( geometry, material.specularColor, material.specularRoughness );
}

#define RE_Direct				RE_Direct_Standard
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Standard
#define RE_IndirectSpecular		RE_IndirectSpecular_Standard
#define Material_BlinnShininessExponent( material )   GGXRoughnessToBlinnExponent( material.specularRoughness )

#ifdef USE_SHADOWMAP

	#if 2 > 0
		uniform sampler2D directionalShadowMap[ 2 ];
		varying vec4 vDirectionalShadowCoord[ 2 ];
	#endif

	#if 0 > 0
		uniform sampler2D spotShadowMap[ 0 ];
		varying vec4 vSpotShadowCoord[ 0 ];
	#endif

	#if 0 > 0
		uniform sampler2D pointShadowMap[ 0 ];
		varying vec4 vPointShadowCoord[ 0 ];
	#endif

	float unpackDepth( const in vec4 rgba_depth ) {
		const vec4 bit_shift = vec4( 1.0 / ( 256.0 * 256.0 * 256.0 ), 1.0 / ( 256.0 * 256.0 ), 1.0 / 256.0, 1.0 );
		return dot( rgba_depth, bit_shift );
	}

	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackDepth( texture2D( depths, uv ) ) );
	}

	float texture2DShadowLerp( sampler2D depths, vec2 size, vec2 uv, float compare ) {
		const vec2 offset = vec2( 0.0, 1.0 );
		vec2 texelSize = vec2( 1.0 ) / size;
		vec2 centroidUV = floor( uv * size + 0.5 ) / size;
		float lb = texture2DCompare( depths, centroidUV + texelSize * offset.xx, compare );
		float lt = texture2DCompare( depths, centroidUV + texelSize * offset.xy, compare );
		float rb = texture2DCompare( depths, centroidUV + texelSize * offset.yx, compare );
		float rt = texture2DCompare( depths, centroidUV + texelSize * offset.yy, compare );
		vec2 f = fract( uv * size + 0.5 );
		float a = mix( lb, lt, f.y );
		float b = mix( rb, rt, f.y );
		float c = mix( a, b, f.x );
		return c;
	}

	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bvec4 inFrustumVec = bvec4 ( shadowCoord.x >= 0.0, shadowCoord.x <= 1.0, shadowCoord.y >= 0.0, shadowCoord.y <= 1.0 );
		bool inFrustum = all( inFrustumVec );
		bvec2 frustumTestVec = bvec2( inFrustum, shadowCoord.z <= 1.0 );
		bool frustumTest = all( frustumTestVec );
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			return (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			return (
				texture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy, shadowCoord.z ) +
				texture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 9.0 );
		#else
			return texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return 1.0;
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		float dp = ( length( lightToPosition ) - shadowBias ) / 1000.0;
		#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec3 offset = vec3( - 1, 0, 1 ) * shadowRadius * 2.0 * texelSize.y;
			return (
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.zzz, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.zxz, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxz, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xzz, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.zzx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.zxx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xzx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.zzy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.zxy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xzy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.zyz, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyz, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.zyx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yzz, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxz, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yzx, texelSize.y ), dp )
			) * ( 1.0 / 21.0 );
		#else
			return texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
		#endif
	}
#endif

#ifdef USE_LOGDEPTHBUF
	uniform float logDepthBufFC;
	#ifdef USE_LOGDEPTHBUF_EXT
		varying float vFragDepth;
	#endif
#endif

varying vec2 vUv;
varying vec3 vWPosition;

uniform vec3 nVu9;
uniform float nVu10;
uniform float nVu11;
uniform sampler2D nVu12;
uniform float nVu13;
uniform float nVu14;
uniform sampler2D nVu15;
uniform float nVu16;
uniform samplerCube nVu17;


vec3 perturbNormal2Arb( vec3 eye_pos, vec3 surf_norm, vec3 map, vec2 mUv, vec2 scale ) {
vec3 q0 = dFdx( eye_pos );
vec3 q1 = dFdy( eye_pos );
vec2 st0 = dFdx( mUv.st );
vec2 st1 = dFdy( mUv.st );
vec3 S = normalize( q0 * st1.t - q1 * st0.t );
vec3 T = normalize( -q0 * st1.s + q1 * st0.s );
vec3 N = normalize( surf_norm );
vec3 mapN = map * 2.0 - 1.0;
mapN.xy = scale * mapN.xy;
mat3 tsn = mat3( S, T, N );
return normalize( tsn * mapN );
}

void main(){
 vec4 nVt0;


#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal = normal * ( -1.0 + 2.0 * float( gl_FrontFacing ) );
	#endif
#endif
#ifdef USE_NORMALMAP
	normal = perturbNormal2Arb( -vViewPosition, normal );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( -vViewPosition, normal, dHdxy_fwd() );
#endif

	StandardMaterial material;
	material.diffuseColor = vec3( 1.0 );

	vec3 diffuseColor = nVu9;
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
#if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)
	gl_FragDepthEXT = log2(vFragDepth) * logDepthBufFC * 0.5;
#endif
nVt0=texture2D(nVu12,vUv);

	float roughnessFactor = mix(nVu10,nVu11,nVt0.w);

	float metalnessFactor = mix(nVu13,nVu14,nVt0.w);


normal = perturbNormal2Arb(-vViewPosition,normal,texture2D(nVu15,vUv).xyz,vUv,(vec2((1.0-nVt0.w))*vec2(nVu16)));
material.diffuseColor = diffuseColor * (1.0 - metalnessFactor);
material.specularRoughness = clamp( roughnessFactor, 0.001, 1.0 );
material.specularColor = mix( vec3( 0.04 ), diffuseColor, metalnessFactor );

GeometricContext geometry;
geometry.position = - vViewPosition;
geometry.normal = normal;
geometry.viewDir = normalize( vViewPosition );
IncidentLight directLight;

#if ( 0 > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	for ( int i = 0; i < 0; i ++ ) {
		pointLight = pointLights[ i ];
		directLight = getPointDirectLight( pointLight, geometry );
		#ifdef USE_SHADOWMAP
		directLight.color *= bool( pointLight.shadow ) ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometry, material, reflectedLight );
	}
#endif
#if ( 0 > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	for ( int i = 0; i < 0; i ++ ) {
		spotLight = spotLights[ i ];
		directLight = getSpotDirectLight( spotLight, geometry );
		#ifdef USE_SHADOWMAP
		directLight.color *= bool( spotLight.shadow ) ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowBias, spotLight.shadowRadius, vSpotShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometry, material, reflectedLight );
	}
#endif

#if ( 2 > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	for ( int i = 0; i < 2; i ++ ) {
		directionalLight = directionalLights[ i ];
		directLight = getDirectionalDirectLight( directionalLight, geometry );
		#ifdef USE_SHADOWMAP
		directLight.color *= bool( directionalLight.shadow ) ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometry, material, reflectedLight );
	}

#endif
#if defined( RE_IndirectDiffuse )
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#ifdef USE_LIGHTMAP
		irradiance += PI * texture2D( lightMap, vUv2 ).xyz * lightMapIntensity;
	#endif
	#if ( 0 > 0 )
		for ( int i = 0; i < 0; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry );
		}
	#endif
	RE_IndirectDiffuse( irradiance, geometry, material, reflectedLight );
#endif

#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	vec3 radiance = getLightProbeIndirectRadiance( geometry, Material_BlinnShininessExponent( material ), 8 );
	RE_IndirectSpecular( radiance, geometry, material, reflectedLight );
#endif

vec3 cameraToVertex = normalize( vWPosition - cameraPosition );
vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
vec3 vReflect = reflect( cameraToVertex, worldNormal );

float specularMIPLevel = GGXRoughnessToBlinnExponent( 1.0 - material.specularRoughness );

RE_IndirectSpecular(textureCube(nVu17,vReflect,specularMIPLevel).xyz, geometry, material, reflectedLight );

vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular;

	outgoingLight = linearToOutput( outgoingLight );

#ifdef USE_FOG
	#ifdef USE_LOGDEPTHBUF_EXT
		float depth = gl_FragDepthEXT / gl_FragCoord.w;
	#else
		float depth = gl_FragCoord.z / gl_FragCoord.w;
	#endif
	#ifdef FOG_EXP2
		float fogFactor = whiteCompliment( exp2( - fogDensity * fogDensity * depth * depth * LOG2 ) );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, depth );
	#endif
	
	outgoingLight = mix( outgoingLight, fogColor, fogFactor );
#endif
gl_FragColor = vec4( outgoingLight, 1.0 );
}