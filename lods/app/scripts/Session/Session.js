define(function() {
    var instance = null;

    function MySingleton() {
        if (instance !== null) {
            throw new Error("Cannot instantiate more than one MySingleton, use MySingleton.getInstance()");
        }

        this.initialize();
    }

    MySingleton.prototype = {
        initialize: function() {
            // summary:
            //      Initializes the singleton.
            this.evtManager = null;
            this.materialList = null;
            this.materialLib = {};
            this.currentScene = null;
        }
    };

    MySingleton.getInstance = function() {
        // summary:
        //      Gets an instance of the singleton. It is better to use
        if (instance === null) {
            instance = new MySingleton();
        }
        return instance;
    };

    return MySingleton.getInstance();
});
