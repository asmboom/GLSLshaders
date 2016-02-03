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

require(["threejs", "orbit",
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
    function(threejs, orbit, depthV, depthF, phongV, CookF, ColorF, normalF, positionF, shadowF, postproV, postproF) {

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

            controls = new THREE.OrbitControls(camera);

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

            var _params = {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.NearestFilter,
                format: THREE.RGBAFormat
            };

            ///// COLOR PASS
            ///
            colorScene = scene.clone();
            var colorMaterial = new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: phongV,
                fragmentShader: ColorF
            });

            colorScene.traverse(function(obj) {
                if (obj instanceof THREE.Mesh)
                    obj.material = colorMaterial;
            });

            colorTarget = new THREE.WebGLRenderTarget(renderer.getSize().width, renderer.getSize().height, _params);

            //// NORMAL PASS
            ///
            normalScene = scene.clone();
            var normalMaterial = new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: phongV,
                fragmentShader: normalF
            });

            normalMaterial.defines = {
                USE_NORMAL: true
            };

            normalMaterial.extensions.derivatives = true;
            normalMaterial.extensions.fragDepth = true;

            normalScene.traverse(function(obj) {
                if (obj instanceof THREE.Mesh)
                    obj.material = normalMaterial;
            });

            normalTarget = new THREE.WebGLRenderTarget(renderer.getSize().width, renderer.getSize().height, _params);

            //// POSITION PASS
            ///
            positionScene = scene.clone();
            var positionMaterial = new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: phongV,
                fragmentShader: positionF
            });

            positionScene.traverse(function(obj) {
                if (obj instanceof THREE.Mesh)
                    obj.material = positionMaterial;
            });

            positionTarget = new THREE.WebGLRenderTarget(renderer.getSize().width, renderer.getSize().height, _params);

            //// DEPTH PASS
            ///
            depthScene = scene.clone();
            var depthMaterial = new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: phongV,
                fragmentShader: depthF
            });

            depthScene.traverse(function(obj) {
                if (obj instanceof THREE.Mesh)
                    obj.material = depthMaterial;
            });

            depthTarget = new THREE.WebGLRenderTarget(renderer.getSize().width, renderer.getSize().height, _params);

            //// DEPTH PASS
            ///
            shadowScene = scene.clone();
            var shadowMaterial = new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: phongV,
                fragmentShader: shadowF
            });

            shadowScene.traverse(function(obj) {
                if (obj instanceof THREE.Mesh)
                    obj.material = shadowMaterial;
            });

            shadowTarget = new THREE.WebGLRenderTarget(renderer.getSize().width, renderer.getSize().height, _params);

            /// POSTPRO COMPOSITE
            /// 
            /// 

            var postproMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    colorMap: {
                        type: "t",
                        value: []
                    },
                    normalMap: {
                        type: "t",
                        value: []
                    },
                    positionMap: {
                        type: "t",
                        value: []
                    },
                    depthMap: {
                        type: "t",
                        value: []
                    },
                    shadowMap: {
                        type: "t",
                        value: []
                    },
                    lightPos: {
                        type: "v3",
                        value: spotLight.position
                    }
                },
                vertexShader: postproV,
                fragmentShader: postproF
            });

            var postproPlaneGEO = new THREE.PlaneBufferGeometry(1, 1);
            postproPlane = new THREE.Mesh(postproPlaneGEO, postproMaterial);
            scene.add(postproPlane);

            postproPlane.material.uniforms.colorMap.value = colorTarget;
            postproPlane.material.uniforms.normalMap.value = normalTarget;
            postproPlane.material.uniforms.positionMap.value = positionTarget;
            postproPlane.material.uniforms.depthMap.value = depthTarget;
            postproPlane.material.uniforms.shadowMap.value = shadowTarget;
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
