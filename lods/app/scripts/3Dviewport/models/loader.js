define(["threejs"], function() {
    var Loader = {};
    Loader.load = function(itemsList, type, callback) {
        var loader;

        switch (type) {
            case "image":
                loader = new THREE.TextureLoader();
                break;

            case "scene":
                loader = new THREE.ObjectLoader();
                break;

            case "object":
                loader = new THREE.JSONLoader();
                break;
        }

        var i = itemsList.length;
        var items = {};
        // Load models recursively
        function loadModel() {
            if (i === 0) {
                callback(items);
                return;
            } else {
                loader.load(itemsList[i - 1], function(item) {
                    items[itemsList[i - 1].match(/\/(.*)\./)[1]] = item;
                    i--;
                    loadModel();
                }, function(request) {
                    // TODO: Set progress info
                }, function(error) {
                    alert("error");
                    console.error("error loading models");
                });
            }
        }

        loadModel();
    };

    return Loader;
});
