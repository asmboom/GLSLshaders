// Set up the scene, camera, and renderer as global variables.
var scene, camera, renderer;
var sceneRTT, cameraRTT;
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

var shadowMap;
var gl;

// Sets up the scene.
function init() {


    var gui, shaderConfig = {
        near: 0.0001,
        far: 0.05,
        shininess: 0.0
    };

    var WIDTH = window.innerWidth - 50,
        HEIGHT = window.innerHeight - 50;

    // Create a renderer and add it to the DOM.
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        logarithmicDepthBuffer: true,
        depth: true
    });

    renderer.setSize(WIDTH, HEIGHT);
    // Set the background color of the scene.
    renderer.setClearColor(0x333F47);
    document.body.appendChild(renderer.domElement);


    GL = renderer.context;
    GL.enable(GL.DEPTH_TEST);
    GL.depthFunc(GL.LEQUAL); // Near things obscure far things
    GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

    // Create the scene and set the scene size.
    scene = new THREE.Scene();

    /* Render to texture settings */
    sceneRTT = new THREE.Scene();

    // Create a camera, zoom it out from the model a bit, and add it to the scene.
    camera = new THREE.PerspectiveCamera(45, WIDTH / HEIGHT, 0.1, 20000);

    // Camera to render depth from the light
    cameraRTT = new THREE.OrthographicCamera(WIDTH / -12, WIDTH / 12, HEIGHT / 12, HEIGHT / -12, -10000, 10000);
    cameraRTT.position.set(350.0, 400.0, -600.0);
    cameraRTT.lookAt(new THREE.Vector3(0, 0, 0));

    // Create a frame buffer
    shadowMap = new THREE.WebGLRenderTarget(1024, 1024, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        depthBuffer: true
    })

    // Create an event listener that resizes the renderer with the browser window.
    window.addEventListener('resize', function() {
        var WIDTH = window.innerWidth,
            HEIGHT = window.innerHeight;
        renderer.setSize(WIDTH, HEIGHT);
        camera.aspect = WIDTH / HEIGHT;
        camera.updateProjectionMatrix();
    });

    //Start loading the scene
    var loader = new THREE.ObjectLoader();
    loader.load('data/building.json', function(scn) {
        scene = scn;
        scene.add(camera);

        var lightPosition = new THREE.Vector4(35.0, 40.0, -60.0, 0.0);

        var lightObj = new THREE.SpotLight(0xffffff, 1, 0, Math.PI / 2, 1);
        lightObj.position.set(lightPosition.x, lightPosition.y, lightPosition.z);
        lightObj.target.position.set(0, 0, 0);

        lightObj.castShadow = true;

        lightObj.shadowCameraNear = 1200;
        lightObj.shadowCameraFar = 2500;
        lightObj.shadowCameraFov = 50;

        //light.shadowCameraVisible = true;

        lightObj.shadowBias = 0.0001;
        lightObj.shadowDarkness = 0.5;

        lightObj.shadowMapWidth = 2048;
        lightObj.shadowMapHeight = 2048;

        scene.add(lightObj);

        /// SHADERS
        /////////////////////////////////////////
        ///

        //Shader for the render to texture
        var materialScreen = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: {
                    type: "t",
                    value: shadowMap
                }
            },
            vertexShader: document.getElementById("vertexShader").textContent,
            fragmentShader: document.getElementById('fragment_shader_screen').textContent
        });

        uniforms = {
            matDiff: {
                type: "v4",
                value: new THREE.Vector4(0.7, 0.7, 0.7, 0.0)
            },
            lightPos: {
                type: "v4",
                value: lightPosition
            },
            lightDiff: {
                type: "v4",
                value: new THREE.Vector4(0.5, 0.5, 0.5, 1.0)
            },
            sceneAmbient: {
                type: "v3",
                value: new THREE.Vector3(0.15, 0.15, 0.15)
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
                value: 0.0
            },
            near: {
                type: "f",
                value: 0.0
            },
            far: {
                type: "f",
                value: 0.5
            },
            shadowMap: {
                type: "t",
                value: shadowMap
            }
        };

        //Main shader
        var shaderMaterial = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: document.getElementById("vertexShader").textContent,
            fragmentShader: document.getElementById("fragmentShader").textContent
        });

        var shadowDepthMaterial = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: {
                    type: "t",
                    value: lightObj.shadowMap
                },
                opacity: {
                    type: "f",
                    value: 1.0
                }
            },
            vertexShader: document.getElementById("vertexShader").textContent,
            fragmentShader: document.getElementById("fragment_depth").textContent
        });


        //var shadowDepthMaterial = new THREE.MeshDepthMaterial();

        var lightMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFF00
        });


        ///Adding, creating elements
        ////////////////////////////////////
        ///

        //Rotating ball
        var geometry = new THREE.SphereGeometry(10, 30, 30);
        bolaMesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
            color: 0xFF0000
        }));
        scene.add(bolaMesh);

        // Light helper
        var lightGeometry = new THREE.SphereGeometry(1.0, 8, 8);
        sphereGeometry = new THREE.Mesh(lightGeometry, lightMaterial);
        sphereGeometry.position.set(lightPosition.x, lightPosition.y, lightPosition.z);
        scene.add(sphereGeometry);


        var building = scene.getObjectByName("combo_ave_01_lod0");


        building.material = shaderMaterial;
        scene.getObjectByName("combo_ave_03_lod0").material = shaderMaterial;
        bolaMesh.material = shaderMaterial;

        var geoPlane = new THREE.PlaneBufferGeometry(90, 50);

        var plane = new THREE.Mesh(geoPlane, materialScreen);

        plane.rotateY(Math.PI);

        scene.add(plane);

        plane.position.z = 25;
        plane.position.y = 50;

        camera.position.set(0, 100, -150);
        camera.lookAt(new THREE.Vector3(0, 0, 0));

        cameraRTT.position = sphereGeometry.position;


        /// UI and Events
        /////////////////////////////////////
        ///

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

        shaderGUI.add(shaderConfig, 'shininess', -1.0, 2.0).onChange(function() {
            uniforms.shininess.value = shaderConfig.shininess;
        });

        shaderGUI.open();

        sceneRTT.children = scene.children;
        sceneRTT.overrideMaterial = shadowDepthMaterial;

        console.log(sceneRTT);
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

    cameraRTT.translateX(x);
    cameraRTT.translateY(y);
    cameraRTT.translateZ(z);
    //cameraRTT.lookAt(new THREE.Vector3(0, 0, 0));

    uniforms.lightPos.value = sphereGeometry.position;

    //Render to texture
    renderer.render(sceneRTT, cameraRTT, shadowMap, true);

    // Render the scene.
    renderer.render(scene, camera);

    bolaMesh.rotateY(0.01);

    requestAnimationFrame(animate);
}
