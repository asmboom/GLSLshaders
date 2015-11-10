// Set up the scene, camera, and renderer as global variables.
var scene, camera, renderer;
var light;
var uniforms, attributes;
var clock;

var x = 0,
    y = 0,
    z = 0;


// Sets up the scene.
function init() {

    var gui, shaderConfig = {
        speed: 1.0,
        frequency: 5.0,
        amplitude: 0.35,
        turbidity: 0.55
    };

    clock = new THREE.Clock();
    var loader = new THREE.ObjectLoader();
    loader.load('data/flag.json', function(scn) {
        scene = scn;
        camera = scn.getObjectByName("camera");

        document.querySelector("#loading").style.display = "none";
        // Create an event listener that resizes the renderer with the browser window.
        window.addEventListener('resize', function() {
            var WIDTH = window.innerWidth,
                HEIGHT = window.innerHeight;
            renderer.setSize(WIDTH, HEIGHT);
            camera.aspect = WIDTH / HEIGHT;
            camera.updateProjectionMatrix();
        });

        // MATERIAL SETUP
        ///////////////////////////////////////////////////////////////////////////////////////////////

        scene.remove(scn.getObjectByName("lamp"));

        var flag = scene.getObjectByName("flag");

        // Create a light, set its position, and add it to the scene.
        light = new THREE.PointLight(0xffffff);
        light.position.set(0, 0, 3);
        scene.add(light);

        attributes = {};

        uniforms = {
            textureFlag: {
                type: "t",
                value: flag.material.map
            },
            textureCloud: {
                type: "t",
                value: THREE.ImageUtils.loadTexture("data/tex/cloud.jpg")
            },
            speed: {
                type: "f",
                value: 1.2
            },
            frequency: {
                type: "f",
                value: 5.0
            },
            amplitude: {
                type: "f",
                value: 0.35
            },
            time: {
                type: "f",
                value: 1.0
            },
            turbidity: {
                type: "f",
                value: 0.55
            }
        };

        uniforms.textureCloud.value.wrapS = uniforms.textureCloud.value.wrapT = THREE.RepeatWrapping;
        

        var shaderMaterial = new THREE.ShaderMaterial({
            vertexColors: THREE.VertexColors,
            uniforms: uniforms,
            attributes: attributes,
            vertexShader: document.getElementById("vertexShader").textContent,
            fragmentShader: document.getElementById("fragmentShader").textContent,
        });

        var testMaterial = new THREE.MeshBasicMaterial({
            vertexColors: THREE.VertexColors
        });


        flag.material = shaderMaterial;


        animate();
    }, function(xhttp) {
        
    }, function(err) {
        console.log(err);
    });

    var WIDTH = window.innerWidth - 50,
        HEIGHT = window.innerHeight - 50;

    // Create a renderer and add it to the DOM.
    renderer = new THREE.WebGLRenderer({
        antialias: true
    });

    renderer.setSize(WIDTH, HEIGHT);
    document.body.appendChild(renderer.domElement);


    // Set the background color of the scene.
    //renderer.setClearColor(0x333F47, 1);

    gui = new dat.GUI();

    shaderGUI = gui.addFolder("Controls");

    shaderGUI.add(shaderConfig, 'speed', 0.1, 5.0).onChange(function() {
        uniforms.speed.value = shaderConfig.speed;
    });

    shaderGUI.add(shaderConfig, 'frequency', 0, 5).onChange(function() {
        uniforms.frequency.value = shaderConfig.frequency;
    });

    shaderGUI.add(shaderConfig, 'amplitude', 0, 1).onChange(function() {
        uniforms.amplitude.value = shaderConfig.amplitude;
    });

    shaderGUI.add(shaderConfig, 'turbidity', 0, 1).onChange(function() {
        uniforms.turbidity.value = shaderConfig.turbidity;
    });

    shaderGUI.open();

}


// Renders the scene and updates the render as needed.
function animate() {

    // Render the scene.
    renderer.render(scene, camera);

    light.position.x += x;
    light.position.y += y;
    light.position.z += z;

    var delta = clock.getDelta();
    uniforms.time.value += delta;

    requestAnimationFrame(animate);
}