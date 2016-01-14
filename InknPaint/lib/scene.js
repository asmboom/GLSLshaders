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
        "text!../data/shaders/phong.frag",
        "text!../data/shaders/color.vert",
        "text!../data/shaders/color.frag",
        "text!../data/shaders/postpro.vert",
        "text!../data/shaders/postpro.frag",
    ],
    function (threejs, orbit, depthV, depthF, phongV, phongF, ColorV, ColorF, postproV, postproF) {

        var SCREEN_WIDTH = window.innerWidth;
        var SCREEN_HEIGHT = window.innerHeight;

        var controls;

        var camera, orthoCamera, scene, rtTexture, sceneRTT, spotLight, uniforms, plane, clock, mixer, helper;
        var shadProjMatrix, lgtMatrix;

        renderer = new THREE.WebGLRenderer({
            antialias: true
        });

        renderer.setClearColor(0xFFFFFF);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);

        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;

        renderer.gammaInput = true;
        renderer.gammaOutput = true;

        renderer.domElement.getContext('webgl').getExtension('OES_standard_derivatives');

        document.body.appendChild(renderer.domElement);

        var uniforms;
        var dirLight;

        camera = new THREE.PerspectiveCamera(30, SCREEN_WIDTH / SCREEN_HEIGHT, 1, 10000);
        camera.position.z = 20;

        var scene = new THREE.Scene();
        scene.add(camera);

        var jsonLoader = new THREE.JSONLoader();
        jsonLoader.load("data/scene.json", function (geo, material) {

            material = new THREE.MeshPhongMaterial({
                color: 0xFFFF99
            });

            var wolvie = new THREE.SkinnedMesh(geo, material);
            wolvie.material.skinning = true;
            wolvie.castShadow = true;
            wolvie.receiveShadow = true;
            scene.add(wolvie);

            clock = new THREE.Clock();

            var ambient = new THREE.AmbientLight(0x444444);
            scene.add(ambient);

            var textureLoader = new THREE.TextureLoader();

            spotLight = new THREE.SpotLight(0xFFFFFF, 1.0);
            spotLight.name = 'Spot Light';
            spotLight.position.set(2, 5, 14);
            spotLight.castShadow = true;
            spotLight.shadowCameraNear = 0.01;
            spotLight.shadowCameraFar = 30;
            spotLight.shadowMapWidth = 1024;
            spotLight.shadowMapHeight = 1024;
            spotLight.shadowBias = -0.000000001;
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
                }
            };

            var customMaterial = new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: phongV,
                fragmentShader: phongF,
                skinning: true
            });

            customMaterial.extensions.derivatives = true;
            customMaterial.defines = {
                USE_NORMAL: true
            };


            textureLoader.load("data/color.png", function (color) {
                customMaterial.uniforms.colorMap.value = color;
                var material = new THREE.MeshPhongMaterial({map: color});
                material.specular = new THREE.Color(0, 0, 0);
                textureLoader.load("data/normals.png", function (color) {
                    customMaterial.uniforms.normalMap.value = color;
                    material.normalMap = color;
                    material.skinning = true;
                    wolvie.material = material;
                    wolvie.material = customMaterial;
                    animate();
                });
            });



        });

        function animate() {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
            var delta = 0.75 * clock.getDelta();
            mixer.update(delta);
            controls.update();
            helper.update();
        };
    });
