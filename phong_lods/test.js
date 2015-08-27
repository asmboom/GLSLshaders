// Set up the scene, camera, and renderer as global variables.
var scene, camera, renderer;
var light;
var uniforms, attributes;
var frame = 0;
var controls;
var control;
var x = 0,
    y = 0,
    z = 0;
var sphereGeometry;
var bolaMesh;
// Sets up the scene.
function init() {

    var gui, shaderConfig = {
        near: 0.0001,
        far: 0.05,
        shininess: 10.0
    };

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

    var loader = new THREE.ObjectLoader();
    loader.load('data/building.json', function(scn) {
        scene = scn;

        scene.add(camera);

        // Create an event listener that resizes the renderer with the browser window.
        window.addEventListener('resize', function() {
            var WIDTH = window.innerWidth,
                HEIGHT = window.innerHeight;
            renderer.setSize(WIDTH, HEIGHT);
            camera.aspect = WIDTH / HEIGHT;
            camera.updateProjectionMatrix();
        });

        // Set the background color of the scene.
        renderer.setClearColor(0x333F47);


        var geometry = new THREE.SphereGeometry(25.0, 32, 32);
        bolaMesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
            color: 0xFF0000
        }));


        //scene.add(bolaMesh);


        var attributes = {

        };


        uniforms = {
            matDiff: {
                type: "v4",
                value: new THREE.Vector4(0.7, 0.7, 0.7, 0.0)
            },
            lightPos: {
                type: "v4",
                value: new THREE.Vector4(350.0, 400.0, 600.0, 0.0)
            },
            lightDiff: {
                type: "v4",
                value: new THREE.Vector4(1.0, 0.964, 0.714, 1.0)
            },
            sceneAmbient: {
                type: "v3",
                value: new THREE.Vector3(0.26, 0.44, 0.624)
            },
            fogColor: {
                type: "v3",
                value: new THREE.Vector3(0.2, 0.247, 0.278)
            },
            texture1: {
                type: "t",
                value: THREE.ImageUtils.loadTexture("data/buildingsAtlas.jpg")
            },
            textureSpec: {
                type: "t",
                value: THREE.ImageUtils.loadTexture("data/buildingsAtlas_spec.jpg")
            },
            shininess: {
                type: "f",
                value: 10.0
            },
            near: {
                type: "f",
                value: 0.0
            },
            far: {
                type: "f",
                value: 0.5
            }
        };

        var shaderMaterial = new THREE.ShaderMaterial({
            uniforms: uniforms,
            attributes: attributes,
            vertexShader: document.getElementById("vertexShader").textContent,
            fragmentShader: document.getElementById("fragmentShader").textContent
        });

        var lightMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFF00
        });


        var lightGeometry = new THREE.SphereGeometry(1.0, 8, 8);
        sphereGeometry = new THREE.Mesh(lightGeometry, lightMaterial);
        scene.add(sphereGeometry);

        sphereGeometry.position.set(350, 600, -400);

        camera.position.set(0, 50, -100);
        camera.lookAt(new THREE.Vector3(0, 0, 0));


        controls = new THREE.OrbitControls(camera);


        document.addEventListener("keydown", function(key) {
            switch (key.keyCode) {
                case 104:
                    //Up
                    y = 1.0;
                    break;
                case 98:
                    //Down
                    y = -1.0;
                    break;
                case 100:
                    //left
                    x = 1.0;
                    break;
                case 102:
                    //right;
                    x = -1.0;
                    break;
                case 101:
                    //+y
                    z = -1.0;
                    break;
                case 96:
                    //-y
                    z = 1.0;
                    break;
            }
        });

        document.addEventListener("keyup", function() {
            x = 0;
            y = 0;
            z = 0;
        });


        gui = new dat.GUI();

        shaderGUI = gui.addFolder("Controls");

        shaderGUI.add(shaderConfig, 'near', 0.0, 0.001).onChange(function() {
            uniforms.near.value = shaderConfig.near;
        });

        shaderGUI.add(shaderConfig, 'far', 0.0, 1.0).onChange(function() {
            uniforms.far.value = shaderConfig.far;
        });

        shaderGUI.add(shaderConfig, 'shininess', 0.0, 100.0).onChange(function() {
            uniforms.shininess.value = shaderConfig.shininess;
        });

        shaderGUI.open();
        var col = THREE.ImageUtils.loadTexture("data/buildingsAtlas.jpg")
        var peck = THREE.ImageUtils.loadTexture("data/buildingsAtlas_spec.jpg")

        var building = scene.getObjectByName("combo_ave_01_lod0");

        uniforms.texture1.value = col;
        uniforms.textureSpec.value = peck;

        building.material = shaderMaterial;

        scene.getObjectByName("combo_ave_03_lod0").material = shaderMaterial;

        bolaMesh.material = shaderMaterial;

        scene.add(bolaMesh);

        animate();
    });
}


// Renders the scene and updates the render as needed.
function animate() {

    var math = Math;
    controls.update();

    sphereGeometry.translateX(x);
    sphereGeometry.translateY(y);
    sphereGeometry.translateZ(z);


    uniforms.lightPos.value = sphereGeometry.position;

    // Render the scene.
    renderer.render(scene, camera);

    bolaMesh.rotateY(0.01);

    // Read more about requestAnimationFrame at http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/
    requestAnimationFrame(animate);
}
