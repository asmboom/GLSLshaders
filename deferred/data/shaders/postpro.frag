uniform sampler2D colorMap;
uniform sampler2D normalMap;
uniform sampler2D positionMap;
uniform sampler2D depthMap;
uniform sampler2D shadowMap;
uniform vec3 lightPos;
varying vec2 vUV;

// set important material values
float roughnessValue = 0.3; // 0 : smooth, 1: rough
float F0 = 0.5; // fresnel reflectance at normal incidence
float k = 0.2; // fraction of diffuse reflection (specular reflection = 1 - k)
vec3 lightColor = vec3(0.6, 0.6, 0.6);

float geo(float NdH, float NdV, float NdL, float VdH){
    // geometric attenuation
    float NH2 = 2.0 * NdH;
    float g1 = (NH2 * NdV) / VdH;
    float g2 = (NH2 * NdL) / VdH;
    return min(1.0, min(g1, g2));
}

// fresnel
float fresnel(float VdH){
    // Schlick approximation
    float fresnelTerm = pow(1.0 - VdH, 5.0);
    fresnelTerm *= (1.0 - F0);
    fresnelTerm += F0;
    return fresnelTerm;
}

// roughness (or: microfacet distribution function)
float roughness(float NdH, vec3 halfVector, vec3 normal){
    float mSquared = roughnessValue * roughnessValue;
    // beckmann distribution function
    
    float r1 = 1.0 / ( 4.0 * mSquared * pow(NdH, 4.0));
    float r2 = (NdH * NdH - 1.0) / (mSquared * NdH * NdH);
    return r1 * exp(r2);

    //Gaussian
    /*float c = 1.0;
    float alpha = acos(dot(normal, halfVector));
    return c * exp(-(alpha/mSquared));*/
}

float cookTorr(vec3 normal, vec3 light, vec3 view){
    //Terms
    vec3 halfVector = normalize(light + view);
    float NdL = max(0.0, dot(normal, light));
    float NdH = max(0.0, dot(normal, halfVector));
    float NdV = max(0.0, dot(normal, view));
    float VdH = max(0.0, dot(view, halfVector));

    return (fresnel(VdH) * geo(NdH, NdV, NdL, VdH) * roughness(NdH, halfVector, normal)) / (NdV * NdL * 3.14);
}

void main(){
    //Texture
    vec3 texColor = texture2D(colorMap, vUV).rgb;
    vec3 texNormal = texture2D(normalMap, vUV).rgb;
    vec3 texPos = texture2D(positionMap, vUV).rgb;
    vec3 texDepth = texture2D(depthMap, vUV).rgb;
    vec3 texShadow = texture2D(shadowMap, vUV).rgb;

    vec3 lightDir = normalize(lightPos - texPos);

    vec3 eyeDir = normalize(cameraPosition - texPos);
    vec3 vHalfVector = normalize(lightDir + eyeDir);

    float NdL = max(0., dot(texNormal,lightDir));
    vec3 outColor = texColor * max(0.3, texShadow.r);
    float halfNormal = pow(max(0., dot(texNormal,vHalfVector)), 100.) * 1.5;

    vec3 ambient = vec3(0.4);
    // gamma correction
    //texColor = pow(texColor, vec3(1.0/2.2) ) * lightColor;

    outColor = texColor * (NdL + ambient) * (ambient + k + cookTorr(texNormal, lightDir, eyeDir) * (1.0 - k)) * (texShadow + ambient);

    //gl_FragColor = vec4(outColor + vec3(halfNormal * 0.1 * texShadow), 1.0);
    gl_FragColor = vec4(outColor, 1.0);
}
 
