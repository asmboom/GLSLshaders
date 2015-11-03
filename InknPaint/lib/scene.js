require.config({
    paths: {
        threejs: "three.min",
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
        "text!../data/shaders/phong.frag"
    ],
    function(threejs, orbit, depthV, depthF, phongV, phongF) {

        var WIDTH = window.innerWidth,
            HEIGHT = window.innerHeight;

        var controls;

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

        loader.load("data/scene.json", function(loadedScene) {

            var aspect = WIDTH / HEIGHT;
            orthoCamera = new THREE.OrthographicCamera(-aspect * 4, aspect * 4, 4, -4, 1, 10);
            var light = loadedScene.getObjectByName("Lamp");

            orthoCamera.position.copy(light.position.clone());
            orthoCamera.lookAt(new THREE.Vector3(0, 0, 0));
            orthoCamera.near = -.1;
            orthoCamera.far = 1.5;

            //loadedScene.remove(light);

            console.log(orthoCamera);

            scene = loadedScene;
            camera = loadedScene.getObjectByName("Camera");

            rtTexture = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
                format: THREE.RGBFormat
            });


            var tLoader = new THREE.TextureLoader();

            tLoader.load("data/webtreats_crimson_red_pattern_02.jpg", function(texture) {

                var uniformDepth = {
                    tDiffuse: {
                        type: "t",
                        value: new THREE.Texture({})
                    },
                    opacity: {
                        type: "f",
                        value: 1
                    }
                };

                var depthMaterial = new THREE.ShaderMaterial({
                    uniforms: uniformDepth,
                    vertexShader: depthV,
                    fragmentShader: depthF
                });

                var depthShader = new THREE.MeshDepthMaterial();
                sceneRTT = scene.clone();
                sceneRTT.overrideMaterial = depthShader;

                var get_projection_ortho = function(width, a, zMin, zMax) {
                    var right = width / 2, //right bound of the projection volume
                        left = -width / 2, //left bound of the proj. vol.
                        top = (width / a) / 2, //top bound
                        bottom = -(width / a) / 2; //bottom bound

                    return [
                        2 / (right - left), 0, 0, 0,
                        0, 2 / (top - bottom), 0, 0,
                        0, 0, 2 / (zMax - zMin), 0,
                        0, 0, 0, 1
                    ];
                };

                var crossVector = function(u, v) {
                    return [u[1] * v[2] - v[1] * u[2],
                        u[2] * v[0] - u[0] * v[2],
                        u[0] * v[1] - u[1] * v[0]
                    ];
                };

                var sizeVector = function(v) {
                    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
                };

                var normalizeVector = function(v) {
                    var n = sizeVector(v);
                    v[0] /= n;
                    v[1] /= n;
                    v[2] /= n;
                };

                var lookAtDir = function(direction, up, C) {
                    var z = [-direction[0], -direction[1], -direction[2]];

                    var x = crossVector(up, z);
                    normalizeVector(x);

                    //orthogonal vector to (C,z) in the plane(y,u)
                    var y = crossVector(z, x); //zx

                    return [x[0], y[0], z[0], 0,
                        x[1], y[1], z[1], 0,
                        x[2], y[2], z[2], 0, -(x[0] * C[0] + x[1] * C[1] + x[2] * C[2]), -(y[0] * C[0] + y[1] * C[1] + y[2] * C[2]), -(z[0] * C[0] + z[1] * C[1] + z[2] * C[2]),
                        1
                    ];
                };

                var LIGHTDIR = [light.position.x, light.position.y, light.position.z];

                var PROJMATRIX_SHADOW = new Float32Array(get_projection_ortho(80, 1, 5, 28));
                var projMatrix_shadow = new THREE.Matrix4();
                projMatrix_shadow.elements = PROJMATRIX_SHADOW;

                var LIGHTMATRIX = new Float32Array(lookAtDir(LIGHTDIR, [0, 1, 0], [0, 0, 0]));
                var lightMatrix = new THREE.Matrix4();
                lightMatrix.elements = LIGHTMATRIX;


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
                        value: projMatrix_shadow
                    },
                    lightLookAt: {
                        type: "m4",
                        value: lightMatrix
                    }
                };

                var phongMaterial = new THREE.ShaderMaterial({
                    uniforms: uniforms,
                    vertexShader: phongV,
                    fragmentShader: phongF
                });

                scene.traverse(function(obj) {
                    if (obj.type === "Mesh")
                        obj.material = phongMaterial
                });

                controls = new THREE.OrbitControls(camera);

                animate();
            });
        });

        function animate() {
            requestAnimationFrame(animate);

            controls.update();

            renderer.clear();
            renderer.clearDepth();
            renderer.render(sceneRTT, orthoCamera, rtTexture, true);
            renderer.render(scene, camera);
            //renderer.render(sceneRTT, orthoCamera);
        };
    });
