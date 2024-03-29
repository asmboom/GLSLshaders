//Varying
varying vec2 vUV;
varying vec3 vNormal;
varying vec3 vPos;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;
varying vec4 resultPos;

//Shadow parameters
uniform mat4 shadMatrix;
varying vec4 vShadowCoord;

varying float vReflectionFactor;
varying vec3 vI;
varying vec3 vWorldNormal;

#ifdef USE_SKINNING
uniform sampler2D boneTexture;
uniform int boneTextureWidth;
uniform int boneTextureHeight;

mat4 getBoneMatrix( const in float i ) {
	float j = i * 4.0;
	float x = mod( j, float( boneTextureWidth ) );
	float y = floor( j / float( boneTextureWidth ) );
	float dx = 1.0 / float( boneTextureWidth );
	float dy = 1.0 / float( boneTextureHeight );
	y = dy * ( y + 0.5 );
	vec4 v1 = texture2D( boneTexture, vec2( dx * ( x + 0.5 ), y ) );
	vec4 v2 = texture2D( boneTexture, vec2( dx * ( x + 1.5 ), y ) );
	vec4 v3 = texture2D( boneTexture, vec2( dx * ( x + 2.5 ), y ) );
	vec4 v4 = texture2D( boneTexture, vec2( dx * ( x + 3.5 ), y ) );
	mat4 bone = mat4( v1, v2, v3, v4 );
	return bone;
}
#endif

void main(){
	
	vec4 mvPosition;

#ifdef USE_SKINNING	
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
	
	vec4 skinVertex = vec4(position, 1.0);
	vec4 skinned  = boneMatX * skinVertex * skinWeight.x;
	skinned      += boneMatY * skinVertex * skinWeight.y;
	skinned      += boneMatZ * skinVertex * skinWeight.z;
	skinned      += boneMatW * skinVertex * skinWeight.w;
	mvPosition = modelViewMatrix * skinned;
	vec4 worldPosition = modelMatrix * skinned;
#else
	mvPosition = modelViewMatrix * vec4(position, 1.0);
	vec4 worldPosition = modelMatrix * vec4(position, 1.0);
#endif

	gl_Position = projectionMatrix * mvPosition;

    //Export varyings
    vUV = uv;
    vPos = position;
    vNormal = normalize(normal);
    resultPos = gl_Position;
    
    vShadowCoord = shadMatrix * worldPosition;
    vViewPosition = mvPosition.xyz;
    vWorldPosition = worldPosition.xyz;

    vWorldNormal = normalize( mat3( modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz ) * normal );
    vI = worldPosition.xyz - cameraPosition;
    vReflectionFactor = 1.0 + dot( normalize( vI ), vWorldNormal );
}