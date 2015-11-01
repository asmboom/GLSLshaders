require.config({
    paths: {
        threejs: "three.min"
    }
});

require(["threejs",
//Shaders
        "text!../data/shaders/depth.vert",
        "text!../data/shaders/depth.frag",
        "text!../data/shaders/phong.vert",
        "text!../data/shaders/phong.frag"],
    function (threejs, depthV, depthF, phongV, phongF) {

        var WIDTH = window.innerWidth, HEIGHT = window.innerHeight;

        var camera, orthoCamera, scene, rtTexture, sceneRTT;
        var renderer = new THREE.WebGLRenderer({
            antialias: true,
            depth: true
        });

        renderer.setSize(WIDTH, HEIGHT);
        renderer.setClearColor(0x000000);
        var loader = new THREE.ObjectLoader();
        renderer.autoClear = false;
        renderer.gammaInput = true;
        renderer.gammaOutput = true;
        document.body.appendChild(renderer.domElement);

        loader.load("data/scene.json", function (loadedScene) {

            var depthShader = new THREE.MeshDepthMaterial();

            var aspect = WIDTH / HEIGHT;
            orthoCamera = new THREE.OrthographicCamera(-aspect * 4, aspect * 4, 4, -4, 1, 10);
            var light = loadedScene.getObjectByName("Lamp");
            orthoCamera.position.copy(light.position.clone());
            orthoCamera.lookAt(new THREE.Vector3(0, 0, 0));
            orthoCamera.near = -.1;
            orthoCamera.far = 1;

            console.log(orthoCamera);

            scene = loadedScene;
            camera = loadedScene.getObjectByName("Camera");

            rtTexture = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
                format: THREE.RGBFormat
            });

            sceneRTT = scene.clone();
            sceneRTT.overrideMaterial = depthShader;

            var tLoader = new THREE.TextureLoader();

            tLoader.load("data/webtreats_crimson_red_pattern_02.jpg", function (texture) {
                //Custom phong
                var uniforms = {
                    matDiff: {
                        type: "v4",
                        value: new THREE.Vector4(0.7, 0.7, 0.7, 0.0)
                    },
                    lightPos: {
                        type: "v4",
                        value: new THREE.Vector4(light.position.x, light.position.y, light.position.z, 0.0)
                    },
                    lightDiff: {
                        type: "v4",
                        value: new THREE.Vector4(1.0, 0.964, 0.714, 1.0)
                    },
                    texture: {
                        type: "t",
                        value: texture
                    },
                    shadowTexture: {
                        type: "t",
                        value: rtTexture
                    },
                    sceneAmbient: {
                        type: "v3",
                        value: new THREE.Vector3(0.26, 0.44, 0.624)
                    },
                    shininess: {
                        type: "f",
                        value: 1.0
                    },
                    lightProj: {
                        type: "m4",
                        value: orthoCamera.projectionMatrix
                    },
                    lightTargetMatrix: {
                        type: "m4",
                        value: orthoCamera.modelViewMatrix
                    }
                };
                var phongMaterial = new THREE.ShaderMaterial({
                    uniforms: uniforms,
                    vertexShader: phongV,
                    fragmentShader: phongF
                });

                scene.traverse(function (obj) {
                    if (obj.type === "Mesh")
                        obj.material = phongMaterial
                });

                animate();
            });
        });

        function animate() {
            requestAnimationFrame(animate);
            renderer.clear();
            renderer.clearDepth();
            renderer.render(sceneRTT, orthoCamera, rtTexture, true);
            renderer.render(scene, camera);
        };
    });