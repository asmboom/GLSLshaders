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
            spotLight.shadow.camera.near = 250000;
            spotLight.shadow.camera.far = 500000;
            spotLight.shadow.mapSize.width = 2048;
            spotLight.shadow.mapSize.height = 2048;
            spotLight.shadow.bias = 0.00000001;
            scene.add(spotLight);

            renderer.shadowMap.render(scene);
            renderer.render(scene, camera);

            uniforms = {
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
                GGXDistribution: {
                    type: "f",
                    value: 0.5
                },
                GGXGeometry: {
                    type: "f",
                    value: 0.5
                },
                FresnelAbsortion: {
                    type: "f",
                    value: 0.5
                },
                FresnelIOR: {
                    type: "f",
                    value: 1.3
                },
                envMap: {
                    type: "t",
                    value: []
                }
            };

            var uniformsPlane = {
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
                GGXDistribution: {
                    type: "f",
                    value: []
                },
                GGXGeometry: {
                    type: "f",
                    value: []
                },
                FresnelAbsortion: {
                    type: "f",
                    value: []
                },
                FresnelIOR: {
                    type: "f",
                    value: []
                },
                envMap: {
                    type: "t",
                    value: []
                }
            };

            var monkeyMaterial = new THREE.ShaderMaterial({
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

            monkeyMaterial.uniforms.envMap.value = cubeCamera.renderTarget;
            planeMaterial.uniforms.envMap.value = cubeCamera.renderTarget;

            /// GUI
            /////////////////////////////////////
            //

            var gui = new dat.GUI();

            var gui, shaderConfig = {
                /*GGXDistribution: 0.5,
                GGXGeometry: 0.5,
                FresnelAbsortion: 2,
                FresnelIOR: 1.4,*/
                ShadowFar: 500000,
                ShadowNear: 250000
            };

            lightGUI = gui.addFolder("PBR");


            /*lightGUI.add(shaderConfig, 'GGXDistribution', .0, 1.0).onChange(function() {
                scene.getObjectByName("Suzanne").material.uniforms["GGXDistribution"].value = shaderConfig.GGXDistribution;
                scene.getObjectByName("Plane").material.uniforms["GGXDistribution"].value = shaderConfig.GGXDistribution;
            });

            lightGUI.add(shaderConfig, 'GGXGeometry', .0, 100.0).onChange(function() {
                scene.getObjectByName("Suzanne").material.uniforms["GGXGeometry"].value = shaderConfig.GGXGeometry;
                scene.getObjectByName("Plane").material.uniforms["GGXGeometry"].value = shaderConfig.GGXGeometry;
            });

            lightGUI.add(shaderConfig, 'FresnelAbsortion', .0, 2.0).onChange(function() {
                scene.getObjectByName("Suzanne").material.uniforms["FresnelAbsortion"].value = shaderConfig.FresnelAbsortion;
                scene.getObjectByName("Plane").material.uniforms["FresnelAbsortion"].value = shaderConfig.FresnelAbsortion;
            });

            lightGUI.add(shaderConfig, 'FresnelIOR', .0, 3.0).onChange(function() {
                scene.getObjectByName("Suzanne").material.uniforms["FresnelAbsortion"].value = shaderConfig.FresnelAbsortion;
                scene.getObjectByName("Plane").material.uniforms["FresnelAbsortion"].value = shaderConfig.FresnelAbsortion;
            });*/

            lightGUI.add(shaderConfig, 'ShadowFar', .0, 5000000).onChange(function() {
                spotLight.shadow.camera.far = shaderConfig.ShadowFar;
            });

            lightGUI.add(shaderConfig, 'ShadowNear', .0, 5000000).onChange(function() {
                spotLight.shadow.camera.near = shaderConfig.ShadowNear;
            });

            var effectController = {
                turbidity: 10,
                reileigh: 2,
                mieCoefficient: 0.005,
                mieDirectionalG: 0.8,
                luminance: 1,
                inclination: 0.16, // elevation / inclination
                azimuth: 0.26, // Facing front,
                sun: !true
            };

            var distance = 400000;

            gui.add(effectController, "turbidity", 1.0, 20.0, 0.1).onChange(guiChanged);
            gui.add(effectController, "reileigh", 0.0, 4, 0.001).onChange(guiChanged);
            gui.add(effectController, "mieCoefficient", 0.0, 0.1, 0.001).onChange(guiChanged);
            gui.add(effectController, "mieDirectionalG", 0.0, 1, 0.001).onChange(guiChanged);
            gui.add(effectController, "luminance", 0.0, 2).onChange(guiChanged);
            gui.add(effectController, "inclination", 0, 1, 0.0001).onChange(guiChanged);
            gui.add(effectController, "azimuth", 0, 1, 0.0001).onChange(guiChanged);
            //gui.add(effectController, "sun").onChange(guiChanged);

            function guiChanged() {

                var uniforms = sky.uniforms;
                uniforms.turbidity.value = effectController.turbidity;
                uniforms.reileigh.value = effectController.reileigh;
                uniforms.luminance.value = effectController.luminance;
                uniforms.mieCoefficient.value = effectController.mieCoefficient;
                uniforms.mieDirectionalG.value = effectController.mieDirectionalG;

                var theta = Math.PI * (effectController.inclination - 0.5);
                var phi = 2 * Math.PI * (effectController.azimuth - 0.5);

                spotLight.position.x = distance * Math.cos(phi);
                spotLight.position.y = distance * Math.sin(phi) * Math.sin(theta);
                spotLight.position.z = distance * Math.sin(phi) * Math.cos(theta);

                //spotLight.target = new THREE.Vector3(0, 0, 0);
                //spotLight.visible = effectController.sun;

                sky.uniforms.sunPosition.value.copy(spotLight.position);

                //renderer.render(scene, camera);
            }

            guiChanged();
            /*
            colorGUI = gui.addFolder("Color");

            colorGUI.add(shaderConfig, 'outline', 0, 0.025).onChange(function() {
                outlineStatic.uniforms.offset.value = shaderConfig.outline;
                outlineMaterial.uniforms.offset.value = shaderConfig.outline;
            });

            colorGUI.add(shaderConfig, 'paint').onChange(function() {
                if (!shaderConfig.paint) {
                    customStatic.uniforms.matcapMap.value = textures["blank"];
                    customMaterial.uniforms.matcapMap.value = textures["blank"];
                } else {
                    customStatic.uniforms.matcapMap.value = textures["ink"];
                    customMaterial.uniforms.matcapMap.value = textures["ink"];
                }
            });

            colorGUI.add(shaderConfig, 'hatches').onChange(function() {
                customStatic.uniforms.hatchesTest.value = shaderConfig.hatches ? 1 : 0;
                customMaterial.uniforms.hatchesTest.value = shaderConfig.hatches ? 1 : 0;
            });*/

            lightGUI.open();


            animate();
        });

        function animate() {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
            renderer.render(skyScene, camera, cubeTarget, true);
            //cubeTest.material.envMap = cubeCamera.renderTarget;

            cubeCamera.updateCubeMap(renderer, skyScene);
            /*
            renderer.render(colorScene, camera, colorTarget, true);
            renderer.render(normalScene, camera, normalTarget, true);
            renderer.render(positionScene, camera, positionTarget, true);
            //renderer.render(depthScene, camera, depthTarget, true);
            renderer.render(shadowScene, camera, shadowTarget, true);
            */

            controls.update();
            //helper.update();
        };

        function initSky() {
            // Add Sky Mesh
            sky = new THREE.Sky();
            //scene.add(sky.mesh);
            skyScene.add(sky.mesh);
            var skyObject = sky.mesh.clone();
            scene.add(skyObject);

            var _params = {
                //minFilter: THREE.LinearFilter,
                //magFilter: THREE.NearestFilter,
                format: THREE.RGBAFormat
            };

            cubeTarget = new THREE.WebGLRenderTargetCube(1024, 1024, _params);

        }
    });
