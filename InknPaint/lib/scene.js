require.config({
    paths: {
        threejs: "three",
        orbit: "OrbitControls"
    },
    shim: {
        "orbit": {
            deps: ["threejs"]
        }
    }
});

require(["threejs", "orbit", "ops",
        //Shaders
        "text!../data/shaders/depth.vert",
        "text!../data/shaders/depth.frag",
        "text!../data/shaders/phong.vert",
        "text!../data/shaders/phong.frag"
    ],
    function(threejs, orbit, Ops, depthV, depthF, phongV, phongF) {

        var WIDTH = window.innerWidth,
            HEIGHT = window.innerHeight;

        var controls;

        var camera, orthoCamera, scene, rtTexture, sceneRTT, light, uniforms;
        var shadProjMatrix, lgtMatrix;

        renderer = new THREE.WebGLRenderer({
            antialias: true
        });
        renderer.setSize(WIDTH, HEIGHT);
        renderer.setClearColor(0xFFFFFF);
        renderer.autoClear = false;
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.autoClear = false;

        renderer.shadowMap.enabled = false;
        //renderer.shadowMap.type = THREE.PCFShadowMap;


        //renderer.gammaInput = true;
        //renderer.gammaOutput = true;


        var uniforms;
        var dirLight;

        var loader = new THREE.ObjectLoader();
        document.body.appendChild(renderer.domElement);

        loader.load("data/scene.json", function(loadedScene) {

            var tLoader = new THREE.TextureLoader();
            tLoader.load("data/webtreats_crimson_red_pattern_02.jpg", function(texture) {

                scene = loadedScene;
                camera = loadedScene.getObjectByName("Camera");

                light = loadedScene.getObjectByName("Lamp");
                light.castShadow = false;
                //light.shadow.camera.fov = 5;
                //light.shadow.camera.near = 1;
                //light.shadow.camera.far = 4;
                //light.shadow.camera.fov = 110;

                light.shadow.mapSize.x = 1024;
                light.shadow.mapSize.y = 1024;
                light.shadow.bias = -0.1;

                rtTexture = new THREE.WebGLRenderTarget(WIDTH, HEIGHT, {
                    format: THREE.RGBFormat
                });

                var aspect = WIDTH / HEIGHT;
                orthoCamera = new THREE.OrthographicCamera(-aspect * 4, aspect * 4, 4, -4, 1, 10);
                orthoCamera.position.copy(light.position.clone());
                orthoCamera.lookAt(new THREE.Vector3(0, 0, 0));
                orthoCamera.near = -.1;
                orthoCamera.far = 1.5;

                console.log(orthoCamera);

                controls = new THREE.OrbitControls(camera);

                var PROJMATRIX_SHADOW = Ops.get_projection_ortho(90, 1, 5, 28);
                var shadProjMatrix = new THREE.Matrix4();
                shadProjMatrix.elements = new Float32Array(PROJMATRIX_SHADOW);

                var LIGHTMATRIX = Ops.lookAtDir([light.position.x, light.position.y, light.position.z], [0, 1, 0], [0, 0, 0]);
                var lgtMatrix = new THREE.Matrix4();
                lgtMatrix.elements = new Float32Array(LIGHTMATRIX);

                uniforms = {
                    diffuse: {
                        type: "v4",
                        value: new THREE.Vector4(0.7, 0.7, 0.7, 0.0)
                    },
                    lightPos: {
                        type: "v4",
                        value: new THREE.Vector4(light.position.x, light.position.y, light.position.z, 0.0)
                    },
                    lightDiff: {
                        type: "v4",
                        value: new THREE.Vector4(1.0, 0.964, 0.714, 1.0)
                    },
                    texture: {
                        type: "t",
                        value: texture
                    },
                    sceneAmbient: {
                        type: "v3",
                        value: new THREE.Vector3(0.26, 0.44, 0.624)
                    },
                    shininess: {
                        type: "f",
                        value: 1.0
                    },
                    shadowTexture: {
                        type: "t",
                        value: null
                    },
                    lightProj: {
                        type: "m4",
                        value: shadProjMatrix
                    },
                    Lmatrix: {
                        type: "m4",
                        value: lgtMatrix
                    }
                };

                var customMaterial = new THREE.ShaderMaterial({
                    uniforms: uniforms,
                    vertexShader: phongV,
                    fragmentShader: phongF
                });

                sceneRTT = scene.clone();
                sceneRTT.overrideMaterial = new THREE.MeshDepthMaterial();

                scene.overrideMaterial = customMaterial;
                animate();
            });
        });

        function animate() {

            requestAnimationFrame(animate);

            if (light.shadow.map) {
                uniforms.shadowTexture.value = rtTexture;
                uniforms.lightProj.value = shadProjMatrix;
                uniforms.Lmatrix.value = lgtMatrix;
            }

            controls.update();
            renderer.clear();
            renderer.clearDepth();
            renderer.render(sceneRTT, orthoCamera, rtTexture, true);

            var mater = new THREE.MeshLambertMaterial({
                map: rtTexture
            });

            scene.overrideMaterial = mater;
            renderer.render(scene, camera);


            //renderer.render(sceneRTT, orthoCamera, rtTexture, true);


        };
    });
