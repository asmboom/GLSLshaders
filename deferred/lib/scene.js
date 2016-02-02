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
        "text!../data/shaders/color.frag",
        "text!../data/shaders/normal.frag",
        "text!../data/shaders/position.frag",
        "text!../data/shaders/shadow.frag",
        "text!../data/shaders/postpro.vert",
        "text!../data/shaders/postpro.frag",
    ],
    function (threejs, orbit, depthV, depthF, phongV, phongF, ColorF, normalF, positionF, shadowF, postproV, postproF) {

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

        renderer.setClearColor(0xFFAAAA);
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

            var rubia = new THREE.SkinnedMesh(geo, material);
            rubia.material.skinning = true;
            rubia.castShadow = true;
            rubia.receiveShadow = true;
            scene.add(rubia);

            clock = new THREE.Clock();

            var ambient = new THREE.AmbientLight(0x444444);
            scene.add(ambient);

            var textureLoader = new THREE.TextureLoader();
            var colorMap, normalMap;

            spotLight = new THREE.SpotLight(0xFFFFFF, 1.0);
            spotLight.name = 'Spot Light';
            spotLight.position.set(2.5, 2.5, 5);
            spotLight.castShadow = true;
            spotLight.shadowCameraNear = 0.01;
            spotLight.shadowCameraFar = 15;
            spotLight.shadowMapWidth = 1024;
            spotLight.shadowMapHeight = 1024;
            scene.add(spotLight);

            renderer.shadowMap.render(scene);
            renderer.render(scene, camera);

            var geometry = new THREE.PlaneGeometry(5, 5);
            var mat = new THREE.MeshBasicMaterial();

            plane = new THREE.Mesh(geometry, mat);
            //plane.position.set(0, 2.5, 7);
            plane.rotateX(-Math.PI / 2);
            plane.receiveShadow = true;
            plane.castShadow = true;

            //plane.material.map = spotLight.shadow.map.texture;
            scene.add(plane);

            /*helper = new THREE.SkeletonHelper(rubia);
             helper.material.linewidth = 1;
             helper.visible = false;
             scene.add(helper);*/

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
                skinning: true,
                //derivatives: true //r73
            });

            customMaterial.extensions.derivatives = true; //r74

            customMaterial.defines = {
                USE_NORMAL: true
            };

            var customNoBones = customMaterial.clone();
            customNoBones.skinning = false;
            customNoBones.defines = {
                USE_NORMAL: false
            };


            var colorMaterial = new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: phongV,
                fragmentShader: ColorF,
                skinning: true
            });

            var colorNoBones = colorMaterial.clone();
            colorNoBones.skinning = false;

            rubia.material = customMaterial;
            plane.material = customNoBones;

            mixer = new THREE.AnimationMixer(rubia);
            var action = mixer.clipAction(rubia.geometry.animations[1], rubia); //r74
            action.play(); //r74

            //mixer.addAction(new THREE.AnimationAction(rubia.geometry.animations[1])); //r73

            textureLoader.load("data/Avatar_welcome_diffuse.png", function (color) {
                customMaterial.uniforms.colorMap.value = color;
                colorMaterial.uniforms.colorMap.value = color;
            });

            textureLoader.load("data/Avatar_welcome_normal.png", function (color) {
                customMaterial.uniforms.normalMap.value = color;
            });

            textureLoader.load("data/city_asphalt_1_d.jpg", function (color) {
                customNoBones.uniforms.colorMap.value = color;
                colorNoBones.uniforms.colorMap.value = color;
            });

            var _params = {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.NearestFilter,
                format: THREE.RGBAFormat
            };

            ///// COLOR PASS
            ///
            colorScene = scene.clone();
            colorScene.traverse(function (obj) {
                if (obj instanceof THREE.Mesh)
                    if (obj.material.skinning === true) {
                        obj.material = colorMaterial;
                        var nuAction = mixer.clipAction(obj.geometry.animations[1], obj); //r74
                        nuAction.play(); //r74
                    } else
                        obj.material = colorNoBones;
            });

            colorTarget = new THREE.WebGLRenderTarget(renderer.getSize().width, renderer.getSize().height, _params);

            //// NORMAL PASS
            ///
            normalScene = scene.clone();
            var normalMaterial = new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: phongV,
                fragmentShader: normalF,
                skinning: true
            });

            normalMaterial.defines = {
                USE_NORMAL: true
            };

            normalMaterial.extensions.derivatives = true;
            normalMaterial.extensions.fragDepth = true;

            var normalNoBones = normalMaterial.clone();
            normalNoBones.skinning = false;

            normalNoBones.defines = {
                USE_NORMAL: false
            };

            normalScene.traverse(function (obj) {
                if (obj instanceof THREE.Mesh)
                    if (obj.material.skinning === true) {
                        obj.material = normalMaterial;
                        var nuAction = mixer.clipAction(obj.geometry.animations[1], obj); //r74
                        nuAction.play(); //r74
                    } else
                        obj.material = normalNoBones;
            });

            normalTarget = new THREE.WebGLRenderTarget(renderer.getSize().width, renderer.getSize().height, _params);

            //// POSITION PASS
            ///
            positionScene = scene.clone();
            var positionMaterial = new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: phongV,
                fragmentShader: positionF,
                skinning: true
            });

            var positionNoBones = positionMaterial.clone();
            positionNoBones.skinning = false;

            positionScene.traverse(function (obj) {
                if (obj instanceof THREE.Mesh)
                    if (obj.material.skinning === true) {
                        obj.material = positionMaterial;
                        var nuAction = mixer.clipAction(obj.geometry.animations[1], obj); //r74
                        nuAction.play(); //r74
                    } else
                        obj.material = positionNoBones;
            });

            positionTarget = new THREE.WebGLRenderTarget(renderer.getSize().width, renderer.getSize().height, _params);

            //// DEPTH PASS
            ///
            depthScene = scene.clone();
            var depthMaterial = new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: phongV,
                fragmentShader: depthF,
                skinning: true
            });

            var depthNoBones = depthMaterial.clone();
            depthNoBones.skinning = false;

            depthScene.traverse(function (obj) {
                if (obj instanceof THREE.Mesh)
                    if (obj.material.skinning === true) {
                        obj.material = depthMaterial;
                        var nuAction = mixer.clipAction(obj.geometry.animations[1], obj); //r74
                        nuAction.play(); //r74
                    } else
                        obj.material = depthNoBones;
            });

            depthTarget = new THREE.WebGLRenderTarget(renderer.getSize().width, renderer.getSize().height, _params);

            //// DEPTH PASS
            ///
            shadowScene = scene.clone();
            var shadowMaterial = new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: phongV,
                fragmentShader: shadowF,
                skinning: true
            });

            var shadowNoBones = shadowMaterial.clone();
            shadowNoBones.skinning = false;

            shadowScene.traverse(function (obj) {
                if (obj instanceof THREE.Mesh)
                    if (obj.material.skinning === true) {
                        obj.material = shadowMaterial;
                        var nuAction = mixer.clipAction(obj.geometry.animations[1], obj); //r74
                        nuAction.play(); //r74
                    } else
                        obj.material = shadowNoBones;
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

            renderer.render(colorScene, camera, colorTarget, true);
            renderer.render(normalScene, camera, normalTarget, true);
            renderer.render(positionScene, camera, positionTarget, true);
            //renderer.render(depthScene, camera, depthTarget, true);
            renderer.render(shadowScene, camera, shadowTarget, true);
            var delta = 0.75 * clock.getDelta();
            mixer.update(delta);
            controls.update();
            //helper.update();
        };
    });
