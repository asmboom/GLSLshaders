// Set up the scene, camera, and renderer as global variables.
var scene, camera, renderer, outlineScene;
var light;
var uniforms, attributes;
var clock;

var x = 0,
    y = 0,
    z = 0;


// Sets up the scene.
function init() {

    clock = new THREE.Clock();
    var loader = new THREE.ObjectLoader();
    loader.load('data/wolvie.json', function (scn) {

        scene = scn;
        camera = scn.getObjectByName("Camera");

        document.querySelector("#loading").style.display = "none";

        // Create an event listener that resizes the renderer with the browser window.
        window.addEventListener('resize', function () {
            var WIDTH = window.innerWidth,
                HEIGHT = window.innerHeight;
            renderer.setSize(WIDTH, HEIGHT);
            camera.aspect = WIDTH / HEIGHT;
            camera.updateProjectionMatrix();
        });

        // MATERIAL SETUP
        ///////////////////////////////////////////////////////////////////////////////////////////////

        var outlineUniforms = {
            offset: {
                type: "f",
                value: 1.0
            }
        };

        var outlineShader = new THREE.ShaderMaterial({
            uniforms: outlineUniforms,
            vertexShader: document.getElementById("outlineVertexShader").textContent,
            fragmentShader: document.getElementById("outlineFragmentShader").textContent,
            side: THREE.BackSide
        });

        var light = scn.getObjectByName("Hemi");

        var colorUniforms = {
            normalMap: {
                type: "t",
                value: THREE.ImageUtils.loadTexture("data/tex/normals.png")
            },
            diffuseMap: {
                type: "t",
                value: THREE.ImageUtils.loadTexture("data/tex/diffuse.png")
            },
            lightPos: {
                type: "v3",
                value: light.position
            }
        };

        var colorShader = new THREE.ShaderMaterial({
            uniforms: colorUniforms,
            vertexShader: document.getElementById("colorVertexShader").textContent,
            fragmentShader: document.getElementById("colorFragmentShader").textContent,
        });


        var testMaterial = new THREE.MeshLambertMaterial({
            color: 0xFF00FF
        });

        var wolvie = scn.getObjectByName("wolvie");
        wolvie.material = colorShader;

        var wolvie2 = wolvie.clone();
        wolvie2.material = outlineShader;

        outlineScene = new THREE.Scene();
        outlineScene.add(wolvie2);

        animate();
    }, function (xhttp) {

    }, function (err) {
        console.log(err);
    });

    var WIDTH = window.innerWidth - 50,
        HEIGHT = window.innerHeight - 50;

    // Create a renderer and add it to the DOM.
    renderer = new THREE.WebGLRenderer({
        antialias: true
    });

    renderer.setSize(WIDTH, HEIGHT);
    renderer.setClearColor(0x555555);
    renderer.autoClear = false;
    renderer.gammaInput = true;
    renderer.gammaOutput = true;
    document.body.appendChild(renderer.domElement);
}


// Renders the scene and updates the render as needed.
function animate() {

    // Render the scene.
    renderer.render(outlineScene, camera);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
