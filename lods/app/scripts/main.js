require.config({
    paths: {
        "jquery": "vendor/jquery/dist/jquery.min",
        "backbone": "vendor/backbone-amd/backbone-min",
        "underscore": "vendor/underscore-amd/underscore-min",
        "threejs": "vendor/threejs/build/three.min",
        "text": "vendor/requirejs-text/text",
        "viewport": "3Dviewport/viewport",
        "session": "Session/Session",
        "orbit": "vendor/threejs/build/OrbitControls",
        "pubsub": "vendor/pubsub/pubsub.min"
    },
    shim: {
        "backbone": {
            deps: ["underscore", "jquery"]
        },
        "orbit": {
            deps: ["threejs"]
        }
    }
});

require(["backbone", "underscore", "jquery", "viewport"], function(backbone, _, $, Viewport) {
    var viewport = new Viewport();
    viewport.initialize({
        gamma: true,
        shadows: true
    });
});
