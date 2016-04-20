define(["session"], function(Session) {

    var Inputs = function(me) {

        var keys = {};
        /**
         * Constructor
         */
        this.initialize = function() {
            this.addKeyEvents();
        };

        /**
         * Eventos de teclado (solo una vez)
         */
        this.addKeyEvents = function() {

            document.addEventListener("keydown", function(ev) {
                keys[ev.which] = true;
                checkKeys(ev);
            });

            document.addEventListener("keyup", function(ev) {
                delete keys[ev.which];
                checkKeys(ev);
            });
        };

        /**
         * Eventos de teclado.
         * Actualiza el objeto global me, para que se mueva segun su loop
         */
        function checkKeys(evt) {

            me.moveForward = false;
            me.moveLeft = false;
            me.moveBackward = false;
            me.moveRight = false;

            for (var i in keys) {
                switch (parseInt(i)) {
                    case 38:
                        // up
                    case 87:
                        // w
                        me.moveForward = true;
                        break;

                    case 37:
                        // left
                    case 65:
                        // a
                        me.moveLeft = true;
                        break;

                    case 40:
                        // down
                    case 83:
                        // s
                        me.moveBackward = true;
                        break;

                    case 39:
                        // right
                    case 68:
                        // d
                        me.moveRight = true;
                }
            }
        }

        /**
         * Loop principal (Llamado desde render en client.js)
         */
        this.update = function() {
            var math = Math;


        };
    };

    return Inputs;
});
