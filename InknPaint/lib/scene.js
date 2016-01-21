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
        "text!../data/shaders/comic.vert",
        "text!../data/shaders/comic.frag",
        "text!../data/shaders/outline.vert",
        "text!../data/shaders/outline.frag",
    ],
    function (threejs, orbit, xGUI, comicV, comicF, outlineV, outlineF) {

        var SCREEN_WIDTH = window.innerWidth;
        var SCREEN_HEIGHT = window.innerHeight;

        var controls;

        var camera, scene, spotLight, clock, mixer, helper;
        var customMaterial, customStatic, outlineMaterial, outlineStatic;

        var wolvie, enviro;

        var lightGUI;

        renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });

        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
        renderer.autoClear = false;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;

        renderer.gammaInput = true;
        renderer.gammaOutput = true;

        document.body.appendChild(renderer.domElement);

        var uniforms;
        var dirLight;

        var modelsReady = false, texturesReady = false;

        camera = new THREE.PerspectiveCamera(30, SCREEN_WIDTH / SCREEN_HEIGHT, 1, 10000);

        var scene = new THREE.Scene();
        scene.add(camera);

        // MODEL LIST LOAD
        ////////////////////////////////////////
        //
        var modelList = ["data/enviro.json", "data/scene.json", "data/snow.json"];
        var i = modelList.length;
        var models = {};
        // Load models recursively
        function loadModel() {
            if (i === 0) {
                modelsReady = true;
                if (texturesReady)
                    init();
                return;
            } else {
                var loader = new THREE.JSONLoader();
                loader.load(modelList[i - 1], function (geo, mat) {
                    models[modelList[i - 1].match(/\/(.*)\./)[1]] = geo;
                    i--;
                    loadModel();
                }, function (request) {
                    //console.log("LOADED................", request.loaded, request.total);
                }, function (error) {
                    alert("error");
                    console.error("error loading models");
                });
            }
        }

        loadModel();

        // TEXTURE LIST LOAD
        ////////////////////////////////////////
        //

        var texturesList = ["data/color.jpg", "data/normals.jpg", "data/ink.jpg", "data/hatch_0.jpg", "data/mask.jpg",
            "data/ground_color.jpg", "data/ground_normals.png", "data/blank.jpg", "data/snow.png"];
        var textures = {};
        var j = texturesList.length;
        // Load textures recursively
        function loadTexture() {
            if (j === 0) {
                texturesReady = true;
                if (modelsReady)
                    init();
                return;
            } else {
                var textureLoader = new THREE.TextureLoader();
                textureLoader.load(texturesList[j - 1], function (tex) {
                    textures[texturesList[j - 1].match(/\/(.*)\./)[1]] = tex;
                    j--;
                    loadTexture();
                }, function (request) {
                    //console.log("LOADED................", request.loaded, request.total);
                }, function (error) {
                    alert("error");
                    console.error("error loading models");
                });
            }
        }


        loadTexture();

        function init() {
            material = new THREE.MeshPhongMaterial({
                color: 0xFFFF99
            });

            wolvie = new THREE.SkinnedMesh(models["scene"], material);
            wolvie.material.skinning = true;
            wolvie.castShadow = true;
            wolvie.receiveShadow = true;
            scene.add(wolvie);

            clock = new THREE.Clock();

            var ambient = new THREE.AmbientLight(0xAAAAAA);
            scene.add(ambient);

            spotLight = new THREE.DirectionalLight(0xFFFFFF, 1.0);
            spotLight.name = 'Spot Light';
            spotLight.position.set(-2, 20, 10);
            spotLight.castShadow = true;
            spotLight.shadowCameraNear = 0.01;
            spotLight.shadowCameraFar = 100;
            spotLight.shadowMapWidth = 2048;
            spotLight.shadowMapHeight = 2048;
            var cameraSpace = 25;
            spotLight.shadowCameraLeft = spotLight.shadowCameraBottom = -cameraSpace;
            spotLight.shadowCameraRight = spotLight.shadowCameraTop = cameraSpace;
            spotLight.shadowBias = -0.000000001;
            spotLight.shadowDarkness = 0.5;
            scene.add(spotLight);

            renderer.shadowMap.render(scene);
            renderer.render(scene, camera);

            helper = new THREE.SkeletonHelper(wolvie);
            helper.material.linewidth = 1;
            helper.visible = false;
            scene.add(helper);

            mixer = new THREE.AnimationMixer(wolvie);
            var clip = wolvie.geometry.animations[1];
            var action = mixer.clipAction(clip, wolvie);
            action.play();

            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.maxPolarAngle = controls.minPolarAngle = 1.4776;
            controls.minAzimuthAngle = -1.15008;
            controls.maxAzimuthAngle = 1.15008;
            camera.position.set(-6, 4, 15);
            controls.center.set(0, 3, 0);
            controls.noPan = true;
            controls.noZoom = true;
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
                    type: "v3",
                    value: spotLight.position
                },
                sceneAmbient: {
                    type: "c",
                    value: ambient.color
                },
                colorMap: {
                    type: "t",
                    value: textures["color"]
                },
                normalMap: {
                    type: "t",
                    value: textures["normals"]
                },
                normalScale: {
                    type: "f",
                    value: 1
                },
                matcapMap: {
                    type: "t",
                    value: textures["ink"]
                },
                hatches: {
                    type: "t",
                    value: textures ["hatch_0"]
                },
                maskMap: {
                    type: "t",
                    value: textures["mask"]
                },
                hatchesTest: {
                    type: "i",
                    value: 1
                }
            };

            uniforms.hatches.value.wrapS = uniforms.hatches.value.wrapT = THREE.RepeatWrapping;

            customMaterial = new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: comicV,
                fragmentShader: comicF,
                skinning: true
            });

            customMaterial.extensions.derivatives = true;

            customMaterial.defines = {
                USE_NORMAL: true
            };

            var staticUniforms = {
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
                    type: "v3",
                    value: spotLight.position
                },
                sceneAmbient: {
                    type: "c",
                    value: ambient.color
                },
                colorMap: {
                    type: "t",
                    value: textures["ground_color"]
                },
                normalMap: {
                    type: "t",
                    value: textures["ground_normals"]
                },
                normalScale: {
                    type: "f",
                    value: 0.5
                },
                matcapMap: {
                    type: "t",
                    value: textures["ink"]
                },
                hatches: {
                    type: "t",
                    value: textures ["hatch_0"]
                },
                maskMap: {
                    type: "t",
                    value: []
                },
                hatchesTest: {
                    type: "i",
                    value: 1
                }
            };

            customStatic = customMaterial.clone();
            customStatic.skinning = false;
            customStatic.uniforms = staticUniforms;

            /// OUTLINE
            outlineMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    offset: {
                        type: "f",
                        value: 0.01
                    },
                    outlineColor: {
                        type: "c",
                        value: new THREE.Color(0, 0, 0)
                    }
                },
                fragmentShader: outlineF,
                vertexShader: outlineV,
                skinning: true
            });

            outlineStatic = outlineMaterial.clone();
            outlineStatic.skinning = false;


            enviro = new THREE.Mesh(models["enviro"], customStatic);
            scene.add(enviro);

            animate();


            /// GUI
            /////////////////////////////////////
            //

            var gui = new dat.GUI();

            var gui, shaderConfig = {
                positionX: 1.0,
                positionY: 20.0,
                outline: 0.01,
                paint: true,
                hatches: true
            };

            lightGUI = gui.addFolder("Lights");

            lightGUI.add(shaderConfig, 'positionX', -11.0, 11.0).onChange(function () {
                spotLight.position.x = shaderConfig.positionX;
            });

            lightGUI.add(shaderConfig, 'positionY', -5, 45).onChange(function () {
                spotLight.position.y = shaderConfig.positionY;
            });

            colorGUI = gui.addFolder("Color");

            colorGUI.add(shaderConfig, 'outline', 0, 0.025).onChange(function () {
                outlineStatic.uniforms.offset.value = shaderConfig.outline;
                outlineMaterial.uniforms.offset.value = shaderConfig.outline;
            });

            colorGUI.add(shaderConfig, 'paint').onChange(function () {
                if (!shaderConfig.paint) {
                    customStatic.uniforms.matcapMap.value = textures["blank"];
                    customMaterial.uniforms.matcapMap.value = textures["blank"];
                } else {
                    customStatic.uniforms.matcapMap.value = textures["ink"];
                    customMaterial.uniforms.matcapMap.value = textures["ink"];
                }
            });

            colorGUI.add(shaderConfig, 'hatches').onChange(function () {
                customStatic.uniforms.hatchesTest.value = shaderConfig.hatches ? 1 : 0;
                customMaterial.uniforms.hatchesTest.value = shaderConfig.hatches ? 1 : 0;
            });

            lightGUI.open();
            colorGUI.open();
            var particleGEO = new THREE.BoxGeometry(5, 5, 5);

            var particles = new THREE.Points(models["snow"], new THREE.PointsMaterial({
                map: textures["snow"],
                transparent: true
            }));
            scene.add(particles);
        }

        function animate() {
            requestAnimationFrame(animate);
            renderer.clear();
            scene.traverse(function (obj) {
                if (obj instanceof THREE.Mesh) {
                    if (obj.material.skinning)
                        obj.material = customMaterial;
                    else
                        obj.material = customStatic;
                    obj.material.side = 0;

                }
            });


            renderer.render(scene, camera);

            scene.traverse(function (obj) {
                if (obj instanceof THREE.Mesh) {
                    if (obj.material.skinning)
                        obj.material = outlineMaterial;
                    else
                        obj.material = outlineStatic;
                    obj.material.side = 1;
                }
            });

            renderer.render(scene, camera);
            var delta = 0.75 * clock.getDelta();
            mixer.update(delta);
            controls.update();
            helper.update();
        };
    });
