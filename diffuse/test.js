// Set up the scene, camera, and renderer as global variables.
var scene, camera, renderer;
var light;
var uniforms, attributes;
var frame = 0;
var controls;
var x = 0,
    y = 0,
    z = 0;
var sphereGeometry;

// Sets up the scene.
function init() {

    // Create the scene and set the scene size.
    scene = new THREE.Scene();
    var WIDTH = window.innerWidth - 50,
        HEIGHT = window.innerHeight - 50;

    // Create a renderer and add it to the DOM.
    renderer = new THREE.WebGLRenderer({
        antialias: true
    });

    renderer.setSize(WIDTH, HEIGHT);
    document.body.appendChild(renderer.domElement);

    // Create a camera, zoom it out from the model a bit, and add it to the scene.
    camera = new THREE.PerspectiveCamera(45, WIDTH / HEIGHT, 0.1, 20000);
    camera.position.set(0, 6, 0);
    scene.add(camera);

    // Create an event listener that resizes the renderer with the browser window.
    window.addEventListener('resize', function () {
        var WIDTH = window.innerWidth,
            HEIGHT = window.innerHeight;
        renderer.setSize(WIDTH, HEIGHT);
        camera.aspect = WIDTH / HEIGHT;
        camera.updateProjectionMatrix();
    });

    // Set the background color of the scene.
    //renderer.setClearColorHex(0x333F47, 1);

    // Create a light, set its position, and add it to the scene.
    light = new THREE.PointLight(0xffffff);
    light.position.set(0, 0, 3);
    scene.add(light);

    var geometry = new THREE.SphereGeometry(1.5, 32, 32);


    var attributes = {

    };

    /*
    attributes = {};
        */
    uniforms = {
        matDiff: {
            type: "v4",
            value: new THREE.Vector4(0.5, 0.5, 0.0, 0.0)
        },
        lightPos: {
            type: "v4",
            value: new THREE.Vector4(0.0, 0.0, 0.0, 0.0)
        },
        lightDiff: {
            type: "v4",
            value: []
        },
        sceneAmbient: {
            type: "v3",
            value: new THREE.Vector3(0.05, 0.05, 0.05)
        },
        matAmbient: {
            type: "v3",
            value: new THREE.Vector3(1.0, 1.0, 0.5)
        },
        constantAttenuation: {
            type: "f",
            value: 0.8
        },
        linearAttenuation: {
            type: "f",
            value: 0.1
        },
        quadraticAttenuation: {
            type: "f",
            value: 0.1
        }
    };

    uniforms.lightDiff.value = new THREE.Vector4(0.5, 0.5, 0.5, 1.0);

    var material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        attributes: attributes,
        vertexShader: document.getElementById("vertexShader").textContent,
        fragmentShader: document.getElementById("fragmentShader").textContent
    });

    var lightMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFF00
    });

    var sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    var lightGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    sphereGeometry = new THREE.Mesh(lightGeometry, lightMaterial);
    light.add(sphereGeometry);

    camera.position.z = 5;
    camera.lookAt(sphere.position);

    controls = new THREE.OrbitControls(camera);

    document.addEventListener("keydown", function (key) {
        switch (key.keyCode) {
        case 104:
            //Up
            y = 0.1;
            break;
        case 98:
            //Down
            y = -0.1;
            break;
        case 100:
            //left
            x = -0.1;
            break;
        case 102:
            //right;
            x = 0.1;
            break;
        case 101:
            //+y
            z = -0.1;
            break;
        case 96:
            //-y
            z = 0.1;
            break;
        }
    });

    document.addEventListener("keyup", function () {
        x = 0;
        y = 0;
        z = 0;
    });
    animate();

}


// Renders the scene and updates the render as needed.
function animate() {

    var math = Math;
    controls.update();

    light.position.x += x;
    light.position.y += y;
    light.position.z += z;

    uniforms.lightPos.value = light.position;

    // Render the scene.
    renderer.render(scene, camera);

    // Read more about requestAnimationFrame at http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/
    requestAnimationFrame(animate);
}