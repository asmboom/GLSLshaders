define(["threejs", "3Dviewport/models/loader", "3Dviewport/models/PoolManager", "orbit",
        "3Dviewport/models/MaterialFactory", "pubsub", "session", "3Dviewport/inputs/inputs"
    ],
    function(threejs, Loader, PoolManager, Orbit, MaterialFactory, PubSub, Session, Inputs) {
        var Viewport = function() {
            var camera, renderer, scene;

            var pool = {};

            var controls;

            var inputs;

            var sceneData = {},
                subset = {};

            Session.evtManager = PubSub;

            /**
             * [initialize description]
             * @param  {[type]} options [description]
             * @return {[type]}         [description]
             */
            this.initialize = function(options) {

                if (!options)
                    options = {};



                // RENDERER
                renderer = new THREE.WebGLRenderer({
                    antialias: true
                });

                renderer.setPixelRatio(window.devicePixelRatio);
                renderer.setSize(window.innerWidth, window.innerHeight);
                renderer.domElement.style.position = "relative";
                document.body.appendChild(renderer.domElement);

                if (options.gamma) {
                    renderer.gammaInput = true;
                    renderer.gammaOutput = true;
                }

                var matManager = new MaterialFactory();
                matManager.init();
                matManager.loadMaterials();

                Session.currentScene = scene = new THREE.Scene();
                camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 10000);
                camera.position.set(0, -2, -30);

                inputs = new Inputs(camera);
                inputs.initialize();

                setLighting();
                if (options.shadows)
                    setShadows();


                window.addEventListener('resize', function() {
                    camera.aspect = window.innerWidth / window.innerHeight;
                    camera.updateProjectionMatrix();
                    renderer.setSize(window.innerWidth, window.innerHeight);
                }, false);

                controls = new THREE.OrbitControls(camera);

                Session.evtManager.subscribe("texturesLoaded", function() {
                    this.loadObjects();
                }.bind(this));


            };

            /**
             * Lights
             */
            var setLighting = function() {

                ambientLight = new THREE.AmbientLight(0x42709f);
                scene.add(ambientLight);

                hemiLight = new THREE.HemisphereLight(0xFFFFFF, 0xffffff, 0.4);
                hemiLight.color.setHSL(0.6, 1, 0.6);
                hemiLight.groundColor.setHSL(0.095, 1, 0.75);
                hemiLight.position.set(350, 600, 400);
                scene.add(hemiLight);

                //Sun
                light = new THREE.DirectionalLight(0xfff6b6, 1.0);
                light.position.set(350, 600, 400);
                light.target.position.copy(camera.position);
                scene.add(light);

                //this.setShadows();
                //Lens Flare
                /*
                var textureLoader = new THREE.TextureLoader();
                textureLoader.load(context + "/resources/images/lensflare0.png", function (tex) {
                    var textureFlare0 = tex;
                    textureLoader.load(context + "/resources/images/lensflare2.png", function (tex) {
                        var textureFlare2 = tex;
                        textureLoader.load(context + "/resources/images/hexangle.png", function (tex) {
                            var textureFlare3 = tex;
                            var h = 0.14, s = 0.9, l = 0.5;

                            var flareColor = new THREE.Color(0xffffff);
                            flareColor.setHSL(h, s, l + 0.5);
                            lensFlare = new THREE.LensFlare(textureFlare0, 1500, 0.0, THREE.AdditiveBlending, flareColor);
                            lensFlare.add(textureFlare2, 512, 0.0, THREE.AdditiveBlending);
                            lensFlare.add(textureFlare2, 512, 0.0, THREE.AdditiveBlending);
                            lensFlare.add(textureFlare2, 512, 0.0, THREE.AdditiveBlending);
                            lensFlare.add(textureFlare3, 60, 0.6, THREE.AdditiveBlending);
                            lensFlare.add(textureFlare3, 70, 0.7, THREE.AdditiveBlending);
                            lensFlare.add(textureFlare3, 120, 0.9, THREE.AdditiveBlending);
                            lensFlare.add(textureFlare3, 70, 1.0, THREE.AdditiveBlending);

                            lensFlare.customUpdateCallback = function (object) {

                                var f, fl = object.lensFlares.length;
                                var flare;
                                var vecX = -object.positionScreen.x * 2;
                                var vecY = -object.positionScreen.y * 2;
                                for (f = 0; f < fl; f++) {

                                    flare = object.lensFlares[f];
                                    flare.x = object.positionScreen.x + vecX * flare.distance;
                                    flare.y = object.positionScreen.y + vecY * flare.distance;
                                    flare.rotation = 0;
                                }

                                object.lensFlares[2].y += 0.025;
                                object.lensFlares[3].rotation = object.positionScreen.x * 0.5 + 0.79;
                            };

                            lensFlare.position.copy(light.position);
                            light.add(lensFlare);
                        });
                    });
                });
                */
            };

            var setShadows = function() {
                light.castShadow = true;
                light.shadow.mapSize.height = light.shadow.mapSize.width = 4096;

                var d = 800;

                light.shadow.camera.left = -d;
                light.shadow.camera.right = d;
                light.shadow.camera.top = d;
                light.shadow.camera.bottom = -d;

                light.shadow.camera.near = 350;
                light.shadow.camera.far = 5000;
                //light.shadow.bias = -0.00001;
                light.shadow.camera.visible = true;

                renderer.shadowMap.enabled = true;
                renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                /*
                                light.position.x = me.lastPosition.x + 350;
                                light.position.y = me.lastPosition.y - 400;
                                light.position.z = me.lastPosition.z + 600;
                                
                                 var dBlur = 200;
                                 //var second shadow
                                 var lightShadow = light.clone();
                                 lightShadow.intensity = 1.0;
                                 lightShadow.shadow.camera.left = -dBlur;
                                 lightShadow.shadow.camera.right = dBlur;
                                 lightShadow.shadow.camera.top = dBlur;
                                 lightShadow.shadow.camera.bottom = -dBlur;
                                 lightShadow.shadow.camera.visible = true;
                                 console.log(lightShadow);*/

                //scene.add(lightShadow);
            };

            /**
             * [loadObjects description]
             * @return {[type]} [description]
             */
            this.loadObjects = function() {
                Loader.load(["data/buildings.json"], "scene", function(items) {
                    //TODO: Sacar fuera
                    sceneData = {
                        building1: {
                            "maxInstances": 4,
                            "lods": [
                                [0, 200],
                                [50, 350],
                                [100, 2000]
                            ],
                            positions: [
                                [0, 0, 0.0, 0.0],
                                [0, 0, 300, 0.0],
                            ]
                        },
                        building2: {
                            "maxInstances": 4,
                            "lods": [
                                [0, 200],
                                [50, 350],
                                [100, 2000]
                            ],
                            positions: [
                                [0, 0, 600, 0.0],
                                [0, 0, 900, 0.0],
                            ]
                        },
                        building3: {
                            "maxInstances": 4,
                            "lods": [
                                [0, 200],
                                [50, 350],
                                [100, 2000]
                            ],
                            positions: [
                                [0, 0, 1200, 0.0],
                                [0, 0, 1500, 0.0],
                            ]
                        },
                        building4: {
                            "maxInstances": 4,
                            "lods": [
                                [0, 200],
                                [50, 350],
                                [100, 2000]
                            ],
                            positions: [
                                [0, 0, 1800, 0.0],
                                [0, 0, 2100, 0.0],
                            ]
                        }
                    };

                    var loadedScene = items["buildings"];
                    for (var name in sceneData) {
                        var geos = [];

                        for (var lod in sceneData[name].lods) {

                            var lodName = name + "_lod" + lod;

                            if (loadedScene.getObjectByName(lodName)) {
                                geos.push([loadedScene.getObjectByName(lodName), sceneData[name].lods[lod]]);
                            }
                        }

                        if (geos.length) {
                            pool[name] = new PoolManager(sceneData[name].maxInstances);
                            pool[name].initialize(geos, name);
                        }
                    }

                    for (var i = 0; i < items["buildings"].children.length; i++) {
                        var obj = items["buildings"].children[i];
                        scene.add(obj);
                    }

                    camera.lookAt(new THREE.Vector3(0, 0, 0));
                    animate();
                });
            };

            function updateLODs(lodContainer, distance, lods) {

                for (var i = 0; i < lodContainer.children.length; i++) {
                    if (distance >= lods[i][0] && distance <= lods[i][1]) {

                        lodContainer.children[i].visible = true;

                    } else {
                        lodContainer.children[i].visible = false;
                    }
                }
            }


            /**
             * [animate description]
             * @return {[type]} [description]
             */
            function animate() {

                inputs.update();
                window.requestAnimationFrame(animate);
                renderer.render(scene, camera);
                controls.update();

                //Make local to speed up scope name resolution
                var math = Math;

                // Elements
                for (var obj in sceneData) {

                    if (!subset[obj])
                        subset[obj] = [];

                    for (var instance in sceneData[obj].positions) {

                        var distance = math.abs(camera.position.clone().distanceTo(new THREE.Vector3(sceneData[obj].positions[instance][0], 0.0, sceneData[obj].positions[instance][2])));
                        if (distance < sceneData[obj].lods[sceneData[obj].lods.length - 1][1]) {
                            if (subset[obj][instance]) {
                                updateLODs(subset[obj][instance][4], distance, sceneData[obj].lods);
                                continue;
                            }

                            subset[obj][instance] = sceneData[obj].positions[instance];
                            subset[obj][instance][4] = pool[obj].get(sceneData[obj].positions[instance]);
                            updateLODs(subset[obj][instance][4], distance, sceneData[obj].lods);
                        } else {
                            if (!subset[obj][instance])
                                continue;

                            pool[obj].free(subset[obj][instance][4]);

                            if (obj.indexOf("bounding") === -1) {
                                delete subset[obj][instance];
                                continue;
                            }

                            delete subset[obj][instance];
                        }
                    }
                }
            };

            this.getScene = function() {
                return scene;
            };

            this.getCamera = function() {
                return camera;
            };

            this.getRenderer = function() {
                return renderer;
            };
        };

        return Viewport;
    });
