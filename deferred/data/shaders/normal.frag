uniform sampler2D normalMap;
uniform sampler2D colorMap;

varying vec2 vUV;
varying vec3 vNormal;
varying vec3 vPos;

varying vec3 vViewPosition;

#ifdef USE_NORMAL 
vec3 perturbNormal2Arb( vec3 eye_pos, vec3 surf_norm ) {

    vec3 q0 = dFdx( eye_pos.xyz );
    vec3 q1 = dFdy( eye_pos.xyz );
    vec2 st0 = dFdx( vUV.st );
    vec2 st1 = dFdy( vUV.st );

    vec3 S = normalize( q0 * st1.t - q1 * st0.t );
    vec3 T = normalize( -q0 * st1.s + q1 * st0.s );
    vec3 N = normalize( surf_norm );

    vec3 mapN = texture2D(normalMap, vUV).xyz * 2.0 - 1.0;
    mapN.xy = vec2(1.0) * mapN.xy;
    mat3 tsn = mat3( S, T, N );
    return normalize( tsn * mapN );

}
#endif

void main(){
    //Normal
    #ifdef USE_NORMAL 
    	vec3 vNormalW = perturbNormal2Arb(-vViewPosition, vNormal);
    #else
    	vec3 vNormalW = normalize(vNormal);
    #endif
    gl_FragColor = vec4(vec3( vNormalW), 1.);
} 
