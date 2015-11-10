uniform mat4 lightProj;
uniform mat4 lightLookAt;

void main(void) {
     gl_Position = lightProj * modelViewMatrix * vec4(position, 1.);
}