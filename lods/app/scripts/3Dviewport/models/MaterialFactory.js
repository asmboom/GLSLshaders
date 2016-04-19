define(["threejs", "session", "../../../data/materialList", //
    "text!../../../data/shaders/fadePhong.vert", //
    "text!../../../data/shaders/fadePhong.frag", //
], function(threejs, Session, MaterialList, //
    vPhong, fPhong) {

    var MaterialFactory = function() {

        this.init = function() {
            Session.materialList = new MaterialList();
        };

        this.loadMaterials = function() {

            var i = Session.materialList.length;

            function getMaterials() {

                if (i === 0) {
                    Session.evtManager.publish("texturesLoaded");
                    return;
                } else {

                    var struct = Session.materialList[i - 1];
                    var texs = [];
                    switch (struct.type) {
                        case "Phong":

                            var textureLoader = new THREE.TextureLoader();
                            textureLoader.load(struct.d, function(tex) {
                                //Diffuse
                                texs[0] = tex;
                                var textureLoader = new THREE.TextureLoader();
                                textureLoader.load(struct.s, function(tex) {
                                    //Specular
                                    texs[1] = tex;
                                    assignShader(struct, texs);
                                    getMaterials();
                                }, function() {
                                    console.log("Error specular");
                                });

                            }, function() {
                                console.log("Error diffuse");
                            });

                            break;
                    }

                    i--;
                }
            }
            getMaterials();
        };

        function assignShader(struct, textures) {
            var uniforms = {};
            var vShader, fShader;

            if (!struct.alpha)
                struct.alpha = 1.0;


            if (!struct.side)
                struct.side = THREE.FrontSide;

            if (!struct.transparent)
                struct.transparent = false;

            if (!struct.mode)
                struct.mode = THREE.NormalBlending;

            Session.materialLib[struct.name] = [];

            for (var j = 0; j < struct.lods.length; j++) {

                var attributes = {};

                switch (j) {
                    case 0:
                        var testColor = new THREE.Vector3(1.0, 0.0, 0.0);
                        break;
                    case 1:
                        var testColor = new THREE.Vector3(0.0, 1.0, 0.0);
                        break;
                    case 2:
                        var testColor = new THREE.Vector3(0.0, 0.0, 1.0);
                        break;
                }

                switch (struct.type) {
                    case "Phong":
                        vShader = vPhong;
                        fShader = fPhong;

                        uniforms = {
                            texture1: {
                                type: "t",
                                value: textures[0]
                            },
                            textureSpec: {
                                type: "t",
                                value: textures[1]
                            },
                            near: {
                                type: "f",
                                value: struct.lods[j][0]
                            },
                            far: {
                                type: "f",
                                value: struct.lods[j][1]
                            },
                            testColor: {
                                type: "v3",
                                value: testColor
                            },
                            alpha: {
                                type: "f",
                                value: struct.alpha
                            }
                        };
                        break;

                }

                Session.materialLib[struct.name][j] = new THREE.ShaderMaterial({
                    uniforms: uniforms,
                    vertexShader: vShader,
                    fragmentShader: fShader,
                    transparent: struct.transparent,
                    side: struct.side,
                    blending: struct.mode
                });

                if (struct.mode !== THREE.NormalBlending)
                    Session.materialLib[struct.name][j].depthWrite = false;

                //Texture repeat ST
                if (struct.repeat) {
                    Session.materialLib[struct.name][j].uniforms.texture1.value.wrapS = Session.materialLib[struct.name][j].uniforms.texture1.value.wrapT = THREE.RepeatWrapping;
                    if (textures[1])
                        Session.materialLib[struct.name][j].uniforms.textureSpec.value.wrapS = Session.materialLib[struct.name][j].uniforms.textureSpec.value.wrapT = THREE.RepeatWrapping;
                }

                if (struct.type === "RegularBlinn")
                    Session.materialLib[struct.name][j].normalMap = true;
            }
        }
    };

    return MaterialFactory;
});
