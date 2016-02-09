require.config({
    paths: {
        threejs: "three",
        orbit: "OrbitControls",
        sky: "SkyShader",
        gui: "dat.gui.min"
    },
    shim: {
        "orbit": {
            deps: ["threejs"]
        },
        "gui": {
            deps: ["threejs"]
        },
        "sky": {
            deps: ["threejs"]
        }
    }
});

require(["threejs", "orbit", "gui", "sky",
        //Shaders
        "text!../data/shaders/depth.vert",
        "text!../data/shaders/depth.frag",
        "text!../data/shaders/phong.vert",
        "text!../data/shaders/cookToor.frag",
        "text!../data/shaders/color.frag",
        "text!../data/shaders/normal.frag",
        "text!../data/shaders/position.frag",
        "text!../data/shaders/shadow.frag",
        "text!../data/shaders/postpro.vert",
        "text!../data/shaders/postpro.frag",
    ],
    function(threejs, orbit, xGUI, xSky, depthV, depthF, phongV, CookF, ColorF, normalF, positionF, shadowF, postproV, postproF) {

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

            initSky();

            cubeCamera = new THREE.CubeCamera(1, 500000, 256);
            //cubeCamera.renderTarget.texture.minFilter = THREE.LinearMipMapLinearFilter;
            scene.add(cubeCamera);


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
                    }
                };

                return struct;
            };

            uniforms = new uniformStruct();
            var uniformsPlane = new uniformStruct();

            monkeyMaterial = new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: phongV,
                fragmentShader: CookF
            });

            var planeMaterial = new THREE.ShaderMaterial({
                uniforms: uniformsPlane,
                vertexShader: phongV,
                fragmentShader: CookF
            });

            var textureLoader = new THREE.TextureLoader();
            textureLoader.load("data/color.jpg", function(tex) {
                monkeyMaterial.uniforms.colorMap.value = tex;
                planeMaterial.uniforms.colorMap.value = sky.material;
            });

            textureLoader.load("data/monkey_normal.jpg", function(tex) {
                monkeyMaterial.uniforms.normalMap.value = tex;
            });

            textureLoader.load("data/monkey.jpg", function(tex) {
                monkeyMaterial.uniforms.cookedAO.value = tex;
            });

            textureLoader.load("data/floor.png", function(tex) {
                planeMaterial.uniforms.cookedAO.value = tex;
            });

            monkeyMaterial.extensions.derivatives = true; //r74

            monkeyMaterial.defines = {
                USE_NORMAL: true
            };

            planeMaterial.extensions.derivatives = true; //r74

            planeMaterial.defines = {
                USE_NORMAL: true
            };

            scene.traverse(function(obj) {
                if (obj instanceof THREE.Mesh) {
                    obj.castShadow = true;
                    obj.receiveShadow = true;
                }
            });

            scene.getObjectByName("Suzanne").material = monkeyMaterial;
            scene.getObjectByName("Plane").material = planeMaterial;
            scene.remove(scene.getObjectByName("Plane"));
            monkeyMaterial.uniforms.envMap.value = cubeCamera.renderTarget;
            planeMaterial.uniforms.envMap.value = cubeCamera.renderTarget;

            /*scene.getObjectByName("Cube.001").material = new THREE.MeshBasicMaterial({
             color: 0xFFFFFF,
             envMap: cubeCamera.renderTarget
             })*/
            /// GUI
            /////////////////////////////////////
            //

            var gui = new dat.GUI();


            var effectController = {
                turbidity: 11,
                reileigh: 0.8,
                mieCoefficient: 0.025,
                mieDirectionalG: 0.95,
                luminance: 1,
                inclination: 0.21, // elevation / inclination
                azimuth: 0.26, // Facing front,
                Roughness: 0.5,
                Metalness: 0.17,
                Reflectivity: 0.17,
                sun: !true
            };

            var distance = 400000;

            gui.add(effectController, "inclination", 0, 1, 0.0001).onChange(guiChanged);
            gui.add(effectController, "azimuth", 0, 1, 0.0001).onChange(guiChanged);
            gui.add(effectController, "Roughness", 0.01, 1, 0.5).onChange(guiChanged);
            gui.add(effectController, "Metalness", 0, 1, 0.17).onChange(guiChanged);
            gui.add(effectController, "Reflectivity", 0, 1, 0.17).onChange(guiChanged);

            function guiChanged() {

                var uniforms = sky.uniforms;
                uniforms.turbidity.value = effectController.turbidity;
                uniforms.reileigh.value = effectController.reileigh;
                uniforms.luminance.value = effectController.luminance;
                uniforms.mieCoefficient.value = effectController.mieCoefficient;
                uniforms.mieDirectionalG.value = effectController.mieDirectionalG;

                planeMaterial.uniforms.roughnessValue.value = monkeyMaterial.uniforms.roughnessValue.value = effectController.Roughness;
                planeMaterial.uniforms.F0.value = monkeyMaterial.uniforms.F0.value = effectController.Metalness;
                planeMaterial.uniforms.fresnelTerm.value = monkeyMaterial.uniforms.fresnelTerm.value = effectController.Reflectivity;

                var theta = Math.PI * (effectController.inclination - 0.5);
                var phi = 2 * Math.PI * (effectController.azimuth - 0.5);

                spotLight.position.x = distance * Math.cos(phi) * 0.01;
                spotLight.position.y = distance * Math.sin(phi) * Math.sin(theta) * 0.01;
                spotLight.position.z = distance * Math.sin(phi) * Math.cos(theta) * 0.01;

                sky.uniforms.sunPosition.value.copy(spotLight.position);
            }

            guiChanged();



            animate();

        });

        function animate() {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
            renderer.render(skyScene, camera, cubeTarget, true);

            cubeCamera.updateCubeMap(renderer, skyScene);
            controls.update();
            monkeyMaterial.uniforms.u_time.value = (new Date() - startTime) * 0.001;
            helper.update();
        };

        function initSky() {
            // Add Sky Mesh
            sky = new THREE.Sky();
            skyScene.add(sky.mesh);
            var skyObject = sky.mesh.clone();
            scene.add(skyObject);

            var _params = {
                format: THREE.RGBAFormat
            };

            cubeTarget = new THREE.WebGLRenderTargetCube(1024, 1024, _params);

        }
    });
