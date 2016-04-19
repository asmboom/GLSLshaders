define(["session"], function(Session) {
    /**
     * Generates a given number of instances into the static memory
     * @param {size} Number of instances of the object to be created
     */

    var PoolManager = function(size) {

        var maxSize = size;
        this.pool = [];
        /**
         * Initializes the pool with the instance of the object passed as parameter. Every object implements the Drawable class
         * to be handled by the pool manager
         * @param {Object} An instance of a THREE.Mesh object
         */
        this.initialize = function(objects, name) {

            this.pool.name = name;

            var obj = new THREE.Object3D();
            for (i = 0; i < objects.length; i++) {
                if (objects[i][0] instanceof THREE.Mesh) {
                    if (objects[i][0].children.length === 0) {
                        if (Session.materialLib[objects[i][0].material.name]) {
                            objects[i][0].material = Session.materialLib[objects[i][0].material.name][i];
                            //TODO: Arreglar el near para los shaders
                            if (i == 0)
                                objects[i][0].near = 0;
                            else
                                objects[i][0].near = objects[i - 1][1][1];

                            objects[i][0].far = objects[i][1][1];
                            objects[i][0].receiveShadow = true;
                            //if (objects[i][0].name.indexOf("asphalt") === -1 || objects[i][0].name.indexOf("line") === -1)
                            objects[i][0].castShadow = true;



                        } else {
                            //console.log("Material Not found: " + objects[i][0].material.name);
                        }
                    } else {
                        //Children materials
                        objects[i][0].traverse(function(subObj) {
                            if (Session.materialLib[subObj.material.name]) {
                                subObj.material = Session.materialLib[subObj.material.name][i];
                            } else {
                                console.log("Material Not found: " + subObj.material.name);
                            }
                        });
                    }

                    obj.add(objects[i][0]);
                    obj.children[i].near = objects[i][1][0];
                    obj.children[i].far = objects[i][1][1];
                }

            }
            for (var i = 0; i < maxSize; i++) {
                this.pool[i] = obj.clone();
                this.pool[i].name = name;
                this.pool[i].visible = false;
                Session.currentScene.add(this.pool[i]);
            }
        };

        /**
         * Extracts an object from the pool
         * @param {number} Transformation Matrix and LOD's [posX, posY, posZ, rotX, rotY, rotZ, near, far]
         * @return {number} THREE object id
         */

        this.get = function(transformationMatrix) {
            var currentObject = this.pool[maxSize - 1];

            if (!currentObject.visible) {

                currentObject.position.x = transformationMatrix[0];
                currentObject.position.y = transformationMatrix[1];
                currentObject.position.z = transformationMatrix[2];

                currentObject.rotation.z = -transformationMatrix[3];

                //Random rotation in trees
                if (currentObject.name === "Tree") {
                    currentObject.rotation.z += Math.round(Math.random() * 4) * Math.PI;
                }

                currentObject.rotation.y = Math.PI;
                currentObject.rotation.x = 0;

                currentObject.poolId = maxSize - 1;
                currentObject.visible = true;
                currentObject.freed = false;
                currentObject.updateMatrixWorld();

                if (currentObject.name.indexOf("bounding_box") !== -1) {
                    currentObject.visible = false;
                }

                if (currentObject.name.indexOf("_signs") !== -1) {
                    var texLoader = new THREE.TextureLoader();

                    texLoader.load(context + "/resources/3dmodels/servicePointsTex/" + transformationMatrix[6] + ".jpg", function(tex) {
                        currentObject.children[0].material = new THREE.MeshBasicMaterial({
                            map: tex
                        });
                    }, function(data) {

                    });
                }

                if (currentObject.name.indexOf("InServicePoint") !== -1) {
                    currentObject.servicePointId = transformationMatrix[7];
                }

                this.pool.unshift(this.pool.pop());
            } else
                console.log(this.pool.name + " REUSED WRONGLY");

            return currentObject;
        };

        this.free = function(obj) {
            obj.visible = false;

            obj.freed = true;
            for (var i = 0; i < this.pool.length; i++)
                if (this.pool[i].freed)
                    this.pool.push((this.pool.splice(i, 1))[0]);

        };
    };

    return PoolManager;
});
