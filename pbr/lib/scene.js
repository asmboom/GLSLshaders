require.config({
    paths: {
        threejs: "three",
        orbit: "OrbitControls",
        gui: "dat.gui.min"
    },
    shim: {
        "orbit": {
            deps: ["threejs"]
        },
        "gui": {
            deps: ["threejs"]
        }
    }
});

require(["threejs", "orbit", "gui",
        //Shaders
        "text!../data/shaders/phong.vert",
        "text!../data/shaders/pbr.frag"
    ],
    function(threejs, orbit, xGUI, phongV, pbrF) {

        var SCREEN_WIDTH = window.innerWidth;
        var SCREEN_HEIGHT = window.innerHeight;

        var controls;

        var camera, orthoCamera, spotLight, uniforms, plane, clock, helper;

        var cubeTarget, cubeTest, cubeCamera;

        var shadProjMatrix, lgtMatrix;

        var startTime = new Date();
        var monkeyMaterial;

        var sky, skyScene;
        var scene, colorScene, normalScene, posScene, depthSecene, shadowScene;
        var mixer;
        var colorTarget, normalTarget, positionTarget, depthTarget, shadowTarget;

        renderer = new THREE.WebGLRenderer({
            antialias: true
        });

        renderer.setClearColor(0xFFFFFF);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);

        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;

        renderer.gammaInput = false;
        renderer.gammaOutput = false;

        skyScene = new THREE.Scene();

        document.body.appendChild(renderer.domElement);

        var uniforms;
        var dirLight;

        var jsonLoader = new THREE.ObjectLoader();
        jsonLoader.load("data/scene.json", function(loadedScene) {

            scene = loadedScene;
            camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500000);
            camera.position.copy(scene.getObjectByName("Camera").position);

            controls = new THREE.OrbitControls(camera, renderer.domElement);

            var ambient = new THREE.AmbientLight(0x888888, 1.0);
            scene.add(ambient);

            var colorMap, normalMap;

            point = scene.getObjectByName("Lamp")
            scene.remove(point);
            spotLight = new THREE.DirectionalLight(0xFFFFFF, 1.0);
            spotLight.position.set(1.0, 2.0, -1.5);
            spotLight.name = 'Spot Light';
            spotLight.castShadow = true;
            spotLight.shadow.camera.near = 800;
            spotLight.shadow.camera.far = 4100;
            spotLight.shadow.mapSize.width = 2048;
            spotLight.shadow.mapSize.height = 2048;
            spotLight.shadow.bias = 0.00001;
            scene.add(spotLight);

            helper = new THREE.DirectionalLightHelper(spotLight, 1000);
            scene.add(helper);
            helper.visible = false;

            renderer.shadowMap.render(scene);
            renderer.render(scene, camera);

            var uniformStruct = function() {
                var struct = {
                    shadMatrix: {
                        type: "m4",
                        value: spotLight.shadow.matrix
                    },
                    shadowTexture: {
                        type: "t",
                        value: spotLight.shadow.map
                    },
                    shadowTextureSize: {
                        type: "v2",
                        value: new THREE.Vector2(spotLight.shadow.map.width, spotLight.shadow.map.height)
                    },
                    shadBias: {
                        type: "f",
                        value: spotLight.shadow.bias
                    },
                    shadDarkness: {
                        type: "f",
                        value: spotLight.shadow.darkness
                    },
                    lightPos: {
                        type: "v4",
                        value: spotLight.position
                    },
                    sceneAmbient: {
                        type: "c",
                        value: ambient.color
                    },
                    colorMap: {
                        type: "t",
                        value: []
                    },
                    cookedAO: {
                        type: "t",
                        value: []
                    },
                    normalMap: {
                        type: "t",
                        value: []
                    },
                    envMap: {
                        type: "t",
                        value: []
                    },
                    roughnessValue: {
                        type: "f",
                        value: []
                    },
                    fresnelTerm: {
                        type: "f",
                        value: 0
                    },
                    F0: {
                        type: "f",
                        value: []
                    },
                    u_time: {
                        type: "f",
                        value: []
                    },
                    roughnessMap: {
                        type: "t",
                        value: []
                    },
                    metalMap: {
                        type: "t",
                        value: []
                    }
                };

                return struct;
            };

            uniforms = new uniformStruct();

            monkeyMaterial = new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: phongV,
                fragmentShader: pbrF
            });

            var textureLoader = new THREE.TextureLoader();
            textureLoader.load("data/Cerberus_A.jpg", function(tex) {
                monkeyMaterial.uniforms.colorMap.value = tex;
            });

            textureLoader.load("data/Cerberus_N.jpg", function(tex) {
                monkeyMaterial.uniforms.normalMap.value = tex;
            });

            monkeyMaterial.extensions.derivatives = true; //r74
            monkeyMaterial.defines = {
                USE_NORMAL: true
            };

            scene.traverse(function(obj) {
                if (obj instanceof THREE.Mesh) {
                    obj.castShadow = true;
                    obj.receiveShadow = true;
                }
            });

            scene.getObjectByName("Suzanne").material = monkeyMaterial;
            scene.remove(scene.getObjectByName("Plane"));
            //monkeyMaterial.uniforms.envMap.value = cubeCamera.renderTarget;
            //
            var path = "data/cube/Park3Med/";
            var format = '.jpg';
            var urls = [
                path + 'px' + format, path + 'nx' + format,
                path + 'py' + format, path + 'ny' + format,
                path + 'pz' + format, path + 'nz' + format
            ];

            var reflectionCube = new THREE.CubeTextureLoader().load(urls);
            reflectionCube.format = THREE.RGBFormat;
            monkeyMaterial.uniforms.envMap.value = reflectionCube;

            /*scene.getObjectByName("Cube.001").material = new THREE.MeshBasicMaterial({
             color: 0xFFFFFF,
             envMap: cubeCamera.renderTarget
             })*/
            /// GUI
            /////////////////////////////////////
            //

            var gui = new dat.GUI();


            var effectController = {
                Roughness: 0.5,
                Reflectivity: 0.17,
                Metalness: 0.17
            };

            gui.add(effectController, "Roughness", 0.01, 1, 0.5).onChange(guiChanged);
            //gui.add(effectController, "Reflectivity", 0, 1, 0.17).onChange(guiChanged);
            gui.add(effectController, "Metalness", 0, 1, 0.17).onChange(guiChanged);

            function guiChanged() {
                monkeyMaterial.uniforms.roughnessValue.value = effectController.Roughness;
                monkeyMaterial.uniforms.F0.value = effectController.Reflectivity;
                monkeyMaterial.uniforms.fresnelTerm.value = effectController.Metalness;
            }

            guiChanged();

            animate();

        });

        function animate() {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
            controls.update();
            monkeyMaterial.uniforms.u_time.value = (new Date() - startTime) * 0.001;
            helper.update();
        };
    });
