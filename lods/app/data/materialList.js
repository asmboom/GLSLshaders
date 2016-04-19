define([], function() {
    var materialList = function(sceneId) {

        var materialData = [{
            name: "building1",
            d: "data/textures/null.jpg",
            s: "data/textures/null.jpg",
            type: "Phong",
            lods: [
                [0.0, 0.03],
                [0.005, 0.15],
                [0.14, 1.0]
            ],
            testColor: [(1.0, 0.0, 0.0), (0.0, 1.0, 0.0), (0.0, 0.0, 1.0)]
        }, {
            name: "building2",
            d: "data/textures/null.jpg",
            s: "data/textures/null.jpg",
            type: "Phong",
            lods: [
                [0.0, 0.03],
                [0.005, 0.15],
                [0.14, 1.0]
            ],
            testColor: [(1.0, 0.0, 0.0), (0.0, 1.0, 0.0), (0.0, 0.0, 1.0)]
        }, {
            name: "building3",
            d: "data/textures/null.jpg",
            s: "data/textures/null.jpg",
            type: "Phong",
            lods: [
                [0.0, 0.03],
                [0.005, 0.15],
                [0.14, 1.0]
            ],
            testColor: [(1.0, 0.0, 0.0), (0.0, 1.0, 0.0), (0.0, 0.0, 1.0)]
        }, {
            name: "building4",
            d: "data/textures/null.jpg",
            s: "data/textures/null.jpg",
            type: "Phong",
            lods: [
                [0.0, 0.03],
                [0.005, 0.15],
                [0.14, 1.0]
            ],
            testColor: [(1.0, 0.0, 0.0), (0.0, 1.0, 0.0), (0.0, 0.0, 1.0)]
        }];



        return materialData;
    };

    return materialList;
});
