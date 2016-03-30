////////////////////////////////////////////////
/// Program: Flag Vertex Shader
/// Description: Mixes vertex colors and a noise texture to 
/// alter the position of the vertices animated by a ripple effect
/// Author: Jesús Carrasco
/// Date: 17/08/2015
////////////////////////////////////////////////

////////////////////////////////////////////////
/// Program: Flag Vertex Shader
/// Description: Mixes vertex colors and a noise texture to
/// alter the position of the vertices animated by a ripple effect
/// Author: JesÃºs Carrasco
/// Date: 17/08/2015
////////////////////////////////////////////////

#ifdef GS_ES
    precision highp float;
#endif

// Uniforms
uniform float speed;
uniform float frequency;
uniform float amplitude;
uniform float gustiness;
uniform float time;

// Varying
varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUV;
varying float vShade;

uniform sampler2D textureCloud;

float textureSize = 256.0;

vec4 Noise( in vec2 x )
{
    vec2 p = floor(x);
    vec2 f = fract(x);
    f = f*f*(3.0-2.0*f);

    vec2 uv = p + f;

#if (1)
    vec4 rg = texture2D(textureCloud, (uv+0.5)/textureSize);
#else
    // on some hardware interpolation lacks precision
    vec4 rg = mix( mix(
                texture2D( textureCloud, (floor(uv)+0.5)/textureSize),
                texture2D( textureCloud, (floor(uv)+vec2(1,0)+0.5)/textureSize),
                fract(uv.x) ),
                  mix(
                texture2D( textureCloud, (floor(uv)+vec2(0,1)+0.5)/textureSize),
                texture2D( textureCloud, (floor(uv)+1.5)/textureSize),
                fract(uv.x) ),
                fract(uv.y) );
#endif

    return rg;
}


float RippleHeight( vec2 pos )
{
    float rippleSpeed = speed * 0.3;
    vec2 p = pos+vec2(-1,.2) * time * rippleSpeed;

    p += vec2(1,0)*Noise(p).y; // more natural looking ripples
    float f = Noise(p).x-.5;
    p *= 2.0;
    p += vec2(0,-.5)*time * rippleSpeed;
    f += (Noise(p).x-.5)*.2;
    p *= 2.0;
    p += vec2(-3,0)*time * rippleSpeed;
    f += (Noise(p).x-.5)*.05;

    f = f*(1.0-exp2(-abs(pos.x)));
    return f*1.0;
}


float DistanceField( vec3 pos )
{
    return (RippleHeight(pos.xy)-pos.z);
}


vec3 Normal( vec3 pos )
{
    const vec2 delta = vec2(0.02,.05);
    vec3 grad;
    grad.x = DistanceField( pos+delta.yxx )-DistanceField( pos-delta.yxx );
    grad.y = DistanceField( pos+delta.xyx )-DistanceField( pos-delta.xyx );
    grad.z = DistanceField( pos+delta.xxy )-DistanceField( pos-delta.xxy );
    return normalize(grad);
}

void main(){
    vec3 v = position;

    float vFix = color.r; //Amount of flexibility of the vertex through the vertex color

    // Noise animation
    float s = time * speed;

    vec2 animUV = uv;
    animUV.x -= s * 0.3;

    vec3 noise = Normal(position + vec3(1.0, 0.0,0.0));

    // Vertex positions alteration
    v.z += sin(frequency * position.x - s) *  amplitude * vFix;
    v.y -= (v.x + 0.8) * vFix;
    v.x += v.z * 0.1 * vFix;

    //TODO: Smoothstep entre frequency y amplitude
    v.xy += noise.xy * 0.1 * (frequency * vFix);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(v, 1.0);

    vShade = 1.0 - clamp(v.z + 1.0, 0.1, 1.0); //Pretty Basic lighting  based on position

    vUV = uv;
    vPosition = position;
    vNormal = noise * normal;
}

