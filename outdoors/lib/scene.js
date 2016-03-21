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
        "text!../data/shaders/cookToor.frag"
    ],
    function(threejs, orbit, xGUI, xSky, depthV, depthF, phongV, CookF) {

        var SCREEN_WIDTH = window.innerWidth;
        var SCREEN_HEIGHT = window.innerHeight;

        var controls;

        var camera, spotLight, helper;

        var cubeTarget, cubeCamera;

        var startTime = new Date();
        var monkeyMaterial;

        var sky, skyScene;
        var scene;

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
                    metalness: {
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
            textureLoader.load("data/color_green.jpg", function(tex) {
                planeMaterial.uniforms.colorMap.value = tex;
            });

            textureLoader.load("data/floor_albedo.jpg", function(tex) {
                monkeyMaterial.uniforms.colorMap.value = tex;
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
            skyScene.add(scene.getObjectByName("Plane").clone());
            //scene.remove(scene.getObjectByName("Plane"));
            monkeyMaterial.uniforms.envMap.value = cubeCamera.renderTarget;
            planeMaterial.uniforms.envMap.value = cubeCamera.renderTarget;

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
                inclination: 0.0, // elevation / inclination
                azimuth: 0.26, // Facing front,
                Roughness: 0.24,
                Metalness: 0.5,
                sun: !true
            };

            var distance = 400000;

            gui.add(effectController, "inclination", 0, 1, 0).onChange(guiChanged);
            gui.add(effectController, "azimuth", 0, 1, 0.0001).onChange(guiChanged);
            gui.add(effectController, "Roughness", 0.01, 1, 0.24).onChange(guiChanged);
            gui.add(effectController, "Metalness", 0, 1, 0.5).onChange(guiChanged);

            /* gui.add(effectController, "Reflectivity", 0, 2, 0.17).onChange(guiChanged);*/

            function guiChanged() {

                var uniforms = sky.uniforms;
                uniforms.turbidity.value = effectController.turbidity;
                uniforms.reileigh.value = effectController.reileigh;
                uniforms.luminance.value = effectController.luminance;
                uniforms.mieCoefficient.value = effectController.mieCoefficient;
                uniforms.mieDirectionalG.value = effectController.mieDirectionalG;

                planeMaterial.uniforms.roughnessValue.value = monkeyMaterial.uniforms.roughnessValue.value = effectController.Roughness;
                planeMaterial.uniforms.metalness.value = monkeyMaterial.uniforms.metalness.value = effectController.Metalness;

                var theta = Math.PI * (effectController.inclination - 0.5);
                var phi = 2 * Math.PI * (effectController.azimuth - 0.5);

                spotLight.position.x = distance * Math.cos(phi) * 0.01;
                spotLight.position.y = distance * Math.sin(phi) * Math.sin(theta) * 0.01;
                spotLight.position.z = distance * Math.sin(phi) * Math.cos(theta) * 0.01;

                sky.uniforms.sunPosition.value.copy(spotLight.position);
            }

            guiChanged();

            document.querySelector("#loading").style.display = "none";
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

            /*var path = "data/cube/skybox/";
             var format = '.jpg';
             var urls = [
             path + 'px' + format, path + 'nx' + format,
             path + 'py' + format, path + 'ny' + format,
             path + 'pz' + format, path + 'nz' + format
             ];

             var reflectionCube = new THREE.CubeTextureLoader().load(urls);
             reflectionCube.format = THREE.RGBFormat;

             var shader = THREE.ShaderLib["cube"];
             shader.uniforms["tCube"].value = reflectionCube;

             var cubeMaterial = new THREE.ShaderMaterial({
             fragmentShader: shader.fragmentShader,
             vertexShader: shader.vertexShader,
             uniforms: shader.uniforms,
             depthWrite: false,
             side: THREE.BackSide
             });

             var cubeUniverseGEO = new THREE.CubeGeometry(500, 500, 500);
             var cubeUniverse = new THREE.Mesh(cubeUniverseGEO, cubeMaterial);
             scene.add(cubeUniverse);
             skyScene.add(cubeUniverse.clone());
             */
            var _params = {
                format: THREE.RGBAFormat
            };

            skyScene.add(sky.mesh);
            var skyObject = sky.mesh.clone();
            scene.add(skyObject);

            cubeTarget = new THREE.WebGLRenderTargetCube(1024, 1024, _params);


        }
    });
