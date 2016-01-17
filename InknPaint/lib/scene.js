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
        "text!../data/shaders/phong.vert",
        "text!../data/shaders/phong.frag",
        "text!../data/shaders/outline.vert",
        "text!../data/shaders/outline.frag",
    ],
    function (threejs, orbit, phongV, phongF, outlineV, outlineF) {

        var SCREEN_WIDTH = window.innerWidth;
        var SCREEN_HEIGHT = window.innerHeight;

        var controls;

        var camera, scene, spotLight, clock, mixer, helper;
        var customMaterial, outlineMaterial;

        var wolvie;

        renderer = new THREE.WebGLRenderer({
            antialias: true
        });

        renderer.setClearColor(0xFFFFFF);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
        renderer.autoClear = false;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;

        renderer.gammaInput = true;
        renderer.gammaOutput = true;

        renderer.domElement.getContext('webgl').getExtension('OES_standard_derivatives');

        document.body.appendChild(renderer.domElement);

        var uniforms;
        var dirLight;

        camera = new THREE.PerspectiveCamera(30, SCREEN_WIDTH / SCREEN_HEIGHT, 1, 10000);
        camera.position.z = 25;
        camera.position.y = 5;

        var scene = new THREE.Scene();
        scene.add(camera);

        var jsonLoader = new THREE.JSONLoader();
        jsonLoader.load("data/scene.json", function (geo, material) {

            material = new THREE.MeshPhongMaterial({
                color: 0xFFFF99
            });

            wolvie = new THREE.SkinnedMesh(geo, material);
            wolvie.material.skinning = true;
            wolvie.castShadow = true;
            wolvie.receiveShadow = true;
            scene.add(wolvie);

            clock = new THREE.Clock();

            var ambient = new THREE.AmbientLight(0x888888);
            scene.add(ambient);

            var textureLoader = new THREE.TextureLoader();

            spotLight = new THREE.SpotLight(0xFFFFFF, 1.0);
            spotLight.name = 'Spot Light';
            spotLight.position.set(2, 3, 25);
            spotLight.castShadow = true;
            spotLight.shadowCameraNear = 0.01;
            spotLight.shadowCameraFar = 45;
            spotLight.shadowMapWidth = 1024;
            spotLight.shadowMapHeight = 1024;
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

            controls = new THREE.OrbitControls(camera);

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
                normalMap: {
                    type: "t",
                    value: []
                },
                matcapMap: {
                    type: "t",
                    value: []
                },
                hatches: {
                    type: "t",
                    value: []
                },
                maskMap: {
                    type: "t",
                    value: []
                }
            };

            customMaterial = new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: phongV,
                fragmentShader: phongF,
                skinning: true,
                derivatives: true
            });

            customMaterial.extensions.derivatives = true;

            customMaterial.defines = {
                USE_NORMAL: true
            };


            textureLoader.load("data/color.jpg", function (color) {
                customMaterial.uniforms.colorMap.value = color;
                var material = new THREE.MeshPhongMaterial({map: color});
                material.specular = new THREE.Color(0, 0, 0);
                textureLoader.load("data/normals.jpg", function (color) {
                    customMaterial.uniforms.normalMap.value = color;
                    material.normalMap = color;
                    textureLoader.load("data/ink.jpg", function (color) {
                        customMaterial.uniforms.matcapMap.value = color;
                        textureLoader.load("data/hatch_0.jpg", function (color) {
                            color.wrapS = color.wrapT = THREE.RepeatWrapping;
                            customMaterial.uniforms.hatches.value = color;

                            textureLoader.load("data/mask.jpg", function (color) {
                                customMaterial.uniforms.maskMap.value = color;
                                material.skinning = true;
                                wolvie.material = material;
                                wolvie.material = customMaterial;
                                animate();
                            });
                        });
                    });
                });
            });

            /// OUTLINE

            outlineMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    offset: {
                        type: "f",
                        value: 0.01
                    },
                    outlineColor: {
                        type: "c",
                        value: new THREE.Color(0, 0, 0.1)
                    }
                },
                fragmentShader: outlineF,
                vertexShader: outlineV,
                skinning: true
            });
        });

        function animate() {
            requestAnimationFrame(animate);
            renderer.clear();
            wolvie.material = customMaterial;
            wolvie.material.side = 0;
            renderer.render(scene, camera);
            wolvie.material = outlineMaterial;
            wolvie.material.side = 1;
            renderer.render(scene, camera);

            var delta = 0.75 * clock.getDelta();
            mixer.update(delta);
            controls.update();
            helper.update();
        };
    });
