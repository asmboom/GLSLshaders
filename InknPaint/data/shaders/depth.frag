uniform float opacity;
uniform sampler2D tDiffuse;

varying vec2 vUv;

float unpackDepth(const in vec4 rgba_depth){
    const vec4 bit_shift = vec4(1./(256.*256.*256.), 1./(256.*256.), 1./256.,1.);
    return dot(rgba_depth, bit_shift);
}

void main(){
    float depth = 1. - unpackDepth(texture2D(tDiffuse, vUv));
    gl_FragColor = opacity * vec4(vec3(depth), 1.0);
}
