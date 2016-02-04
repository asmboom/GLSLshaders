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
    function(threejs, orbit, xGUI, depthV, depthF, phongV, CookF, ColorF, normalF, positionF, shadowF, postproV, postproF) {

        var SCREEN_WIDTH = window.innerWidth;
        var SCREEN_HEIGHT = window.innerHeight;

        var controls;

        var camera, orthoCamera, spotLight, uniforms, plane, clock, helper;
        var shadProjMatrix, lgtMatrix;

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

        document.body.appendChild(renderer.domElement);

        var uniforms;
        var dirLight;

        var jsonLoader = new THREE.ObjectLoader();
        jsonLoader.load("data/scene.json", function(loadedScene) {

            scene = loadedScene;
            camera = scene.getObjectByName("Camera");

            controls = new THREE.OrbitControls(camera, renderer.domElement);

            var ambient = new THREE.AmbientLight(0x888888, 1.0);
            scene.add(ambient);

            var textureLoader = new THREE.TextureLoader();
            var colorMap, normalMap;

            point = scene.getObjectByName("Lamp")
            scene.remove(point);
            spotLight = new THREE.DirectionalLight(0xFFFFFF, 1.0);
            spotLight.position.set(1.0, 2.0, -1.5);
            spotLight.name = 'Spot Light';
            spotLight.castShadow = true;
            spotLight.shadowCameraNear = 0.01;
            spotLight.shadowCameraFar = 10;
            spotLight.shadowMapWidth = 2048;
            spotLight.shadowMapHeight = 2048;
            spotLight.shadowBias = 0.001;
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
                planeMaterial.uniforms.colorMap.value = tex;
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

            /*textureLoader.load("data/monkey_normal.jpg", function(tex) {
                monkeyMaterial.uniforms.normalMap.value = tex;
            });*/

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
            scene.getObjectByName("Plane").material = planeMaterial;



            /// GUI
            /////////////////////////////////////
            //

            var gui = new dat.GUI();

            var gui, shaderConfig = {
                GGXDistribution: 0.5,
                GGXGeometry: 0.5,
                FresnelAbsortion: 2,
                FresnelIOR: 1.4,
            };

            lightGUI = gui.addFolder("PBR");


            lightGUI.add(shaderConfig, 'GGXDistribution', .0, 1.0).onChange(function() {
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
            });


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
    });
