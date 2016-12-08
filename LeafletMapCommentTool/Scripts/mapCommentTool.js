// findIndex polyfill
if (!Array.prototype.findIndex) {
    Object.defineProperty(Array.prototype, 'findIndex', {
        value: function (predicate) {
            'use strict';
            if (this === null) {
                throw new TypeError('Array.prototype.findIndex called on null or undefined');
            }
            if (typeof predicate !== 'function') {
                throw new TypeError('predicate must be a function');
            }
            var list = Object(this);
            var length = list.length >>> 0;
            var thisArg = arguments[1];
            var value;

            for (var i = 0; i < length; i++) {
                value = list[i];
                if (predicate.call(thisArg, value, i, list)) {
                    return i;
                }
            }
            return -1;
        },
        enumerable: false,
        configurable: false,
        writable: false
    });
}

(function (factory, window) {

    // define an AMD module that relies on 'leaflet'
    if (typeof define === 'function' && define.amd) {
        define(['leaflet'], factory);

        // define a Common JS module that relies on 'leaflet'
    } else if (typeof exports === 'object') {
        module.exports = factory(require('leaflet'));
    }

    // attach your plugin to the global 'L' variable
    if (typeof window !== 'undefined' && window.L) {
        window.L.MapCommentTool = factory(L);
    }
}(function (L) {
    var MapCommentTool = {
        options: {

        },

        getMessage: function () {
            return 'Map Comment Tool';
        },

        addTo: function (map) {
            var self = this;
            self.ownMap = map;

            // Add root object as 'root' for all components
            self.ControlBar.root = self;
            self.Comments.root = self;
            self.Util.root = self;
            self.Tools.root = self;
            self.Network.root = self;

            self.currentMode = 'map';
            var customControl = L.Control.extend({

                options: {
                    position: 'topleft'
                    //control position - allowed: 'topleft', 'topright', 'bottomleft', 'bottomright'
                },

                onAdd: function (map) {
                    var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');

                    container.style.backgroundColor = 'white';
                    container.style.width = '40px';
                    container.style.height = '40px';
                    container.style.cursor = 'pointer';
                    container.innerHTML = '<img src="assets/pencil.png" class="panel-control-icon">'; // this is temporary...
                    container.onclick = function () {
                        self.ControlBar.toggle();
                    };

                    return container;
                },
            });
            map.addControl(new customControl());

            var visibileClass = (self.ControlBar.isVisible()) ? 'visible' : '';

            // decide control bar position

            self.ControlBar.options.position = (window.innerHeight < window.innerWidth) ? 'right' : 'bottom';

            // Create sidebar container
            var container = self.ControlBar._container =
              L.DomUtil.create('div', 'leaflet-control-bar-' + self.ControlBar.options.position + ' leaflet-control-bar ' + visibileClass);
            var content = self.ControlBar._contentContainer;

            L.DomEvent
              .on(container, 'transitionend',
                self.ControlBar._handleTransitionEvent, self)
              .on(container, 'webkitTransitionEnd',
                self.ControlBar._handleTransitionEvent, self);

            var controlContainer = map._controlContainer;
            controlContainer.insertBefore(container, controlContainer.firstChild);

            self.mergeCanvas = document.createElement('canvas');
            self._map = map;

            map.MapCommentTool = MapCommentTool;
        },

        startDrawingMode: function (comment) {
            var self = this;
            // spawn a drawing canvas
            self.drawingCanvas = L.canvas({
                padding: 0
            });
            self.drawingCanvas.addTo(map);

            // set canvas class
            self.drawingCanvas._container.className += " drawing-canvas";

            // set mode to "drawing"
            self.currentMode = 'drawing';
            // set toolbar view to "drawing"
            self.ControlBar.currentView = self.ControlBar.displayControl('drawing', comment.id);

            // Remove all comment layer groups from map
            self.Comments.list.forEach(function (_comment) {
                _comment.removeFrom(map);
            });

            self.Comments.editingComment = comment;

            // turn on all drawing tools
            self.Tools.on();

        },

        stopDrawingMode: function () {
            var self = this;

            // set mode to "drawing"
            self.currentMode = 'controlBarHome';
            // set toolbar view to "drawing"
            self.ControlBar.currentView = self.ControlBar.displayControl('home');

            // turn off all drawing tools
            self.Tools.off();

            self.Comments.editingComment = '';

            // Add all comment layer groups to map
            self.Comments.list.forEach(function (comment) {
                comment.addTo(map);
            });

            self.drawingCanvas.removeFrom(map);
            delete self.drawingCanvas;

        }
    };


    MapCommentTool.ControlBar = {

        options: {
            position: 'right',
        },

        visible: false,
        currentView: '',

        isVisible: function () {
            var self = this;
            return self.visible;
        },
        show: function () {
            var self = this;

            self.root.currentMode = 'controlBarHome';

            self.visible = true;

            L.DomUtil.addClass(self._container, 'visible');

            var controls = document.getElementsByClassName("leaflet-control leaflet-bar");
            for (var i = 0; i < controls.length; i++) {
                controls[i].style.visibility = 'hidden';
            }

            self.root.ownMap.dragging.disable();
            self.root.ownMap.touchZoom.disable();
            self.root.ownMap.doubleClickZoom.disable();
            self.root.ownMap.scrollWheelZoom.disable();
            self.root.ownMap.boxZoom.disable();
            self.root.ownMap.keyboard.disable();
            if (self.root.ownMap.tap) {
                self.root.ownMap.tap.disable();
            }
            document.getElementById('map').style.cursor = 'default';

            self.currentView = self.displayControl('home');

            // on success, should return true
            return true;
        },
        hide: function (e) {
            var self = this;

            self.root.currentMode = 'map';

            self.visible = false;

            L.DomUtil.removeClass(self._container, 'visible');
            var controls = document.getElementsByClassName("leaflet-control leaflet-bar");
            for (var i = 0; i < controls.length; i++) {
                controls[i].style.visibility = 'visible';
            }
            if (e) {
                L.DomEvent.stopPropagation(e);
            }
            self.root.ownMap.dragging.enable();
            self.root.ownMap.touchZoom.enable();
            self.root.ownMap.doubleClickZoom.enable();
            self.root.ownMap.scrollWheelZoom.enable();
            self.root.ownMap.boxZoom.enable();
            self.root.ownMap.keyboard.enable();
            if (self.root.ownMap.tap) {
                self.root.ownMap.tap.enable();
            }
            document.getElementById('map').style.cursor = 'grab';
            // on success, should return true
            return true;
        },
        toggle: function () {
            var self = this;

            var toggleSuccess = self.isVisible() ? self.hide() : self.show();

            return toggleSuccess;
        },

        _handleTransitionEvent: function (e) {
            var self = this;
            //if (e.propertyName == 'left' || e.propertyName == 'right' ||e.propertyName == 'bottom' || e.propertyName == 'top')
            //self.fire(self.ControlBar.isVisible() ? 'shown' : 'hidden');
        },

        displayControl: function (mode, commentId) {
            var self = this;
            // clear the display
            L.DomUtil.empty(self._container);

            switch (mode) {
                case 'home':
                    self.homeView();
                    break;
                case 'drawing':
                    self.drawingView(commentId);
                    break;
                default:

            }

            return mode;
            //
        },

        homeView: function () {
            var self = this;

            var homeView = L.DomUtil.create('div', 'controlbar-view controlbar-home', self._container);
            var closeButton = L.DomUtil.create('button', 'controlbar-button controlbar-close', homeView);
            closeButton.onclick = function () {
                self.hide();
            };
            var br = L.DomUtil.create('br', '', homeView);
            var newCommentButton = L.DomUtil.create('button', 'controlbar-button controlbar-new', homeView);
            newCommentButton.innerHTML = "New Comment";
            newCommentButton.onclick = function () {
                return self.startNewComment();
            };

            var commentListDiv = L.DomUtil.create('div', 'comment-list-div', homeView);
            var commentList = L.DomUtil.create('ul', 'comment-list-ul', commentListDiv);
            self.root.Comments.list.forEach(function (comment) {
                var commentLi = L.DomUtil.create('li', 'comment-list-li', commentList);
                commentLi.innerHTML = comment.name;
                var image;
                comment.getLayers().forEach(function (layer) {
                    if (layer.layerType == 'drawing') {
                        image = layer;
                    }
                });

                var editCommentButton = L.DomUtil.create('u', '', commentLi);

                if (self.root.Network.lockedComments.indexOf(comment.id) > -1) {
                    editCommentButton.innerHTML = " Edit - LOCKED ";
                } else {
                    editCommentButton.innerHTML = " Edit ";
                    editCommentButton.onclick = function () {
                        return self.editComment(comment, image);
                    };
                }

            });

        },

        drawingView: function (commentId) {
            var self = this;
            var drawingView = L.DomUtil.create('div', 'controlbar-view controlbar-home', self._container);
            var br = L.DomUtil.create('br', '', drawingView);
            var saveDrawingButton = L.DomUtil.create('button', 'controlbar-button controlbar-save', drawingView);
            saveDrawingButton.innerHTML = "Save";
            saveDrawingButton.onclick = function () {
                self.saveDrawing(commentId);
            };
            var cancelDrawingButton = L.DomUtil.create('button', 'controlbar-button controlbar-cancel', drawingView);
            cancelDrawingButton.innerHTML = "Cancel";
            cancelDrawingButton.onclick = function () {
                self.cancelDrawing(commentId);
            };
            var br2 = L.DomUtil.create('br', '', drawingView);
            var redPenSelectButton = L.DomUtil.create('button', 'controlbar-button controlbar-tool tool-pen', drawingView);
            var redPenSelectImage = L.DomUtil.create('img', '', redPenSelectButton);
            redPenSelectImage.src = "assets/red-pen.png";
            redPenSelectButton.onclick = function () {
                self.root.Tools.setCurrentTool('pen', {
                    colour: 'red'
                });
            };
            var yellowPenSelectButton = L.DomUtil.create('button', 'controlbar-button controlbar-tool tool-pen', drawingView);
            var yellowPenSelectImage = L.DomUtil.create('img', '', yellowPenSelectButton);
            yellowPenSelectImage.src = "assets/yellow-pen.png";
            yellowPenSelectButton.onclick = function () {
                self.root.Tools.setCurrentTool('pen', {
                    colour: 'yellow'
                });
            };
            var blackPenSelectButton = L.DomUtil.create('button', 'controlbar-button controlbar-tool tool-pen', drawingView);
            var blackPenSelectImage = L.DomUtil.create('img', '', blackPenSelectButton);
            blackPenSelectImage.src = "assets/black-pen.png";
            blackPenSelectButton.onclick = function () {
                self.root.Tools.setCurrentTool('pen', {
                    colour: 'black'
                });
            };
            var eraserSelectButton = L.DomUtil.create('button', 'controlbar-button controlbar-tool tool-eraser', drawingView);
            var eraserSelectImage = L.DomUtil.create('img', '', eraserSelectButton);
            eraserSelectImage.src = "assets/eraser.png";
            eraserSelectButton.onclick = function () {
                self.root.Tools.setCurrentTool('eraser');
            };
        },

        startNewComment: function () {
            var self = this;

            // create new comment
            var newComment = self.root.Comments.newComment();

            // trigger drawing mode
            self.root.startDrawingMode(newComment);

            return newComment;
        },

        editComment: function (comment, image) {
            var self = this;
            // fly to comment
            //map.flyToBounds(image._bounds, {animate: false});

            // trigger drawing mode
            self.root.startDrawingMode(comment);

            var canvas = self.root.drawingCanvas._container;
            var context = canvas.getContext('2d');
            var canvasTransformArray;

            // for phantomJS
            if (self.root.PHANTOMTEST) {
                canvasTransformArray = [0, 0];
            } else {
                canvasTransformArray = canvas.style.transform.split(/,|\(|\)|px| /);
            }

            var imageObj = new Image();

            var newWidth = image._image.width * self.root.ownMap.getZoomScale(self.root.ownMap.getZoom(), comment.zoomLevel);
            var newHeight = image._image.height * self.root.ownMap.getZoomScale(self.root.ownMap.getZoom(), comment.zoomLevel);

            imageObj.onload = function () {
                context.drawImage(imageObj, image._image._leaflet_pos.x, image._image._leaflet_pos.y, newWidth, newHeight);
            };

            imageObj.src = image._image.src;

            var eventDetails = {
                "detail": {
                    "message": "A drawing is being edited",
                    "payload": {
                        "id": comment.id,
                    },
                }
            };
            event = new CustomEvent("edit-start", eventDetails);
            document.dispatchEvent(event);

            return comment;
        },

        saveDrawing: function (commentId) {

            var self = this;

            var commentIndex = self.root.Comments.list.findIndex(function (comment) {
                return comment.id === commentId;
            });

            var comment = self.root.Comments.list[commentIndex];



            // prompt for title saving...
            if (!comment.saveState) {
                comment.name = prompt("Please name your note", "Note") || "Note";
            }
            comment.zoomLevel = self.root.ownMap.getZoom();

            // SAVING LOGIC
            var context = self.root.drawingCanvas._ctx;
            var canvas = context.canvas;

            var canvasDrawing = canvas.toDataURL("data:image/png");

            var imageBoundsXY = self.root.drawingCanvas._bounds;
            var imageBoundsMinCoord = self.root.ownMap.layerPointToLatLng(imageBoundsXY.min);
            var imageBoundsMaxCoord = self.root.ownMap.layerPointToLatLng(imageBoundsXY.max);
            var imageBounds = [
              [imageBoundsMinCoord.lat, imageBoundsMinCoord.lng],
              [imageBoundsMaxCoord.lat, imageBoundsMaxCoord.lng]
            ];
            var drawing = L.imageOverlay(canvasDrawing, imageBounds);
            drawing.layerType = 'drawing';
            var oldDrawing;
            if (comment.saveState) {
                comment.getLayers().forEach(function (layer) {
                    if (layer.layerType == 'drawing') {
                        comment.removeLayer(layer);
                        oldDrawing = layer;
                    }
                });
            }

            comment.addLayer(drawing);

            var prepareEvent = function (layers) {
                // Fire "Save drawing event"
                // TO BE HEAVILY REFACTORED
                var event;
                var eventDetails;
                if (oldDrawing) {
                    eventDetails = {
                        "detail": {
                            "message": "A drawing has been edited and saved",
                            "payload": {
                                "id": comment.id,
                                "name": comment.name,
                                "layers": [],
                                "zoomLevel": comment.zoomLevel,
                            },
                        }
                    };

                    layers.forEach(function (layer) {
                        var layerAdd = {};
                        layerAdd.layerType = layer.layerType;
                        if (layer.layerType == 'drawing') {
                            layerAdd._bounds = layer._bounds;
                            layerAdd.src = layer._url;
                        }
                        eventDetails.detail.payload.layers.push(layerAdd);
                    });
                    event = new CustomEvent("save-drawing", eventDetails);
                } else {
                    eventDetails = {
                        "detail": {
                            "message": "A new drawing has been saved",
                            "payload": {
                                "id": comment.id,
                                "name": comment.name,
                                "layers": [],
                                "zoomLevel": comment.zoomLevel,
                            },
                        }
                    };

                    layers.forEach(function (layer) {
                        var layerAdd = {};
                        layerAdd.layerType = layer.layerType;
                        if (layer.layerType == 'drawing') {
                            layerAdd._bounds = layer._bounds;
                            layerAdd.src = layer._url;
                        }
                        eventDetails.detail.payload.layers.push(layerAdd);
                    });
                    event = new CustomEvent("new-drawing", eventDetails);
                }
                return event;
            };

            if (oldDrawing) {
                var mergeCanvas = self.root.mergeCanvas;
                document.body.appendChild(canvas);
                var mergeContext = mergeCanvas.getContext('2d');

                var newX_left = self.root.ownMap.latLngToLayerPoint(self.root.ownMap.getBounds()._southWest).x;
                var newX_right = self.root.ownMap.latLngToLayerPoint(self.root.ownMap.getBounds()._northEast).x;
                var newY_top = self.root.ownMap.latLngToLayerPoint(self.root.ownMap.getBounds()._northEast).y;
                var newY_bottom = self.root.ownMap.latLngToLayerPoint(self.root.ownMap.getBounds()._southWest).y;
                var oldX_left = self.root.ownMap.latLngToLayerPoint(oldDrawing._bounds._southWest).x;
                var oldX_right = self.root.ownMap.latLngToLayerPoint(oldDrawing._bounds._northEast).x;
                var oldY_top = self.root.ownMap.latLngToLayerPoint(oldDrawing._bounds._northEast).y;
                var oldY_bottom = self.root.ownMap.latLngToLayerPoint(oldDrawing._bounds._southWest).y;

                var leftMost = Math.min(newX_left, oldX_left);
                var rightMost = Math.max(newX_right, oldX_right);
                var topMost = Math.min(newY_top, oldY_top);
                var bottomMost = Math.max(newY_bottom, oldY_bottom);

                mergeCanvas.height = bottomMost - topMost;
                mergeCanvas.width = rightMost - leftMost;

                var oldImageToCanvas = new Image();
                var newImageToCanvas = new Image();
                var mergedDrawingLayer;
                var newSouthWest = self.root.ownMap.layerPointToLatLng([leftMost, bottomMost]);
                var newNorthEast = self.root.ownMap.layerPointToLatLng([rightMost, topMost]);

                oldImageToCanvas.onload = function () {
                    mergeContext.drawImage(oldImageToCanvas, oldX_left - leftMost, oldY_top - topMost, oldX_right - oldX_left, oldY_bottom - oldY_top);
                    newImageToCanvas.src = canvasDrawing;
                };
                newImageToCanvas.onload = function () {
                    // to make the eraser tool work...
                    mergeContext.globalCompositeOperation = "destination-out";
                    mergeContext.fillStyle = "white";
                    mergeContext.fillRect(newX_left - leftMost, newY_top - topMost, newX_right - newX_left, newY_bottom - newY_top);

                    mergeContext.globalCompositeOperation = "source-over";
                    mergeContext.drawImage(newImageToCanvas, newX_left - leftMost, newY_top - topMost, newX_right - newX_left, newY_bottom - newY_top);
                    var mergedDrawing = mergeCanvas.toDataURL("data:image/png");
                    comment.removeLayer(drawing);
                    mergedDrawingLayer = L.imageOverlay(mergedDrawing, [newSouthWest, newNorthEast]);
                    comment.addLayer(mergedDrawingLayer);
                    mergedDrawingLayer.layerType = 'drawing';

                    var event = prepareEvent(comment.getLayers());
                    // Dispatch/Trigger/Fire the event
                    document.dispatchEvent(event);

                };

                oldImageToCanvas.src = oldDrawing._image.src;
            } else {
                var event = prepareEvent(comment.getLayers());
                // Dispatch/Trigger/Fire the event
                document.dispatchEvent(event);
            }

            self.root.stopDrawingMode();

            comment.saveState = true;

            return comment;
        },

        cancelDrawing: function (commentId) {
            var self = this;
            var commentIndex = self.root.Comments.list.findIndex(function (comment) {
                return comment.id === commentId;
            });
            var comment = self.root.Comments.list[commentIndex];
            if (!comment.saveState) {
                self.root.Comments.list.pop();
            } 
            self.root.stopDrawingMode();
            return true;
        }

    };


    MapCommentTool.Comments = {

        list: [],
        editingComment: {},

        saved: function (comment) {
            var self = this;
            return comment.saveState;
        },

        newComment: function () {
            var self = this;
            var comment = L.layerGroup();
            comment.saveState = false;
            comment.id = self.root.Util.generateGUID();

            self.list.push(comment);
            return comment;
        }

    };

    MapCommentTool.Util = {
        generateGUID: function () {
            function s4() {
                return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
            }
            return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
        },

        getMousePos: function (x, y) {
            var self = this;
            // this parses stuff like "translate3d(-1257px, -57px, 0px)" and turns it into an array like...
            // [ "translate3d", "-1257", "", "", "-57", "", "", "0", "", "" ]
            var canvasTransformArray = self.root.drawingCanvas._container.style.transform.split(/,|\(|\)|px| /);
            var x_true = x + (parseFloat(canvasTransformArray[1]));
            var y_true = y + (parseFloat(canvasTransformArray[4]));
            return {
                x: x_true,
                y: y_true,
            };
        },
    };

    MapCommentTool.Tools = {
        currentTool: '',
        toolList: ['pen', 'eraser', 'text'],
        defaultTool: 'pen',

        on: function () {
            var self = this;
            self.pen.root = self.root;
            self.eraser.root = self.root;
            self.text.root = self.root;


            self.setCurrentTool(self.defaultTool, {
                colour: 'red'
            });
        },

        off: function () {
            var self = this;
            self[self.currentTool].terminate();
            self.currentTool = '';

        },

        setCurrentTool: function (tool, options) {
            var self = this;
            if (self.currentTool) {
                self[self.currentTool].terminate();
            }
            self.currentTool = tool;
            self[self.currentTool].initialize(options);
            // set canvas class
            self.toolList.forEach(function (toolname) {
                self.root.drawingCanvas._container.classList.remove("drawing-canvas-" + toolname);
            });
            self.root.drawingCanvas._container.classList.add("drawing-canvas-" + tool);
            return tool;
        },

        pen: {
            name: 'pen',
            colour: 'red',
            strokeWidth: '',
            stroke: false,
            mouseX: 0,
            mouseY: 0,
            lastX: -1,
            lastY: -1,
            initialize: function (options) {
                var self = this;
                self.colour = options.colour;
                self.root.drawingCanvas._container.classList.add("drawing-canvas-" + self.colour + "-pen");

                self.setListeners();
            },
            terminate: function () {
                var self = this;
                self.root.drawingCanvas._container.classList.remove("drawing-canvas-" + self.colour + "-pen");
            },
            drawLine: function (ctx, x, y, size) {
                var self = this;
                //operation properties
                ctx.globalCompositeOperation = "source-over";

                // If lastX is not set, set lastX and lastY to the current position
                if (self.lastX == -1) {
                    self.lastX = x;
                    self.lastY = y;
                }

                ctx.strokeStyle = self.colour;
                ctx.lineCap = "round";
                ctx.beginPath();
                ctx.moveTo(self.lastX, self.lastY);
                ctx.lineTo(x, y);
                ctx.lineWidth = size;
                ctx.stroke();
                ctx.closePath();
                // Update the last position to reference the current position
                self.lastX = x;
                self.lastY = y;
            },

            // don't have to remove listeners because the canvas gets removed anyways...
            setListeners: function () {
                var self = this;
                var canvas = self.root.drawingCanvas._container;
                var context = canvas.getContext('2d');
                canvas.addEventListener('mousedown', function () {
                    if (self.root.Tools.currentTool == 'pen') {
                        self.stroke = true;
                    }
                });

                canvas.addEventListener('mousemove', function (e) {
                    if (self.stroke && self.root.Tools.currentTool == 'pen') {
                        var pos = self.root.Util.getMousePos(e.clientX, e.clientY);
                        self.mouseX = pos.x;
                        self.mouseY = pos.y;
                        self.drawLine(context, self.mouseX, self.mouseY, 3);
                    }
                }, false);

                window.addEventListener('mouseup', function (e) {
                    if (self.stroke && self.root.Tools.currentTool == 'pen') {
                        self.stroke = false;
                        // Reset lastX and lastY to -1 to indicate that they are now invalid, since we have lifted the "pen"
                        self.lastX = -1;
                        self.lastY = -1;
                    }
                }, false);
            }
        },

        eraser: {
            name: 'eraser',
            color: '',
            strokeWidth: '',
            stroke: false,
            mouseX: 0,
            mouseY: 0,
            lastX: -1,
            lastY: -1,
            initialize: function () {
                var self = this;
                self.setListeners();
                self.root.ownMap.getPane('markerPane').style['z-index'] = 600;
            },
            terminate: function () {
                var self = this;
                self.root.ownMap.getPane('markerPane').style['z-index'] = 300;
            },
            drawLine: function (ctx, x, y, size) {
                var self = this;
                //operation properties
                ctx.globalCompositeOperation = "destination-out";

                // If lastX is not set, set lastX and lastY to the current position
                if (self.lastX == -1) {
                    self.lastX = x;
                    self.lastY = y;
                }

                r = 250;
                g = 0;
                b = 0;
                a = 255;
                ctx.strokeStyle = "rgba(" + r + "," + g + "," + b + "," + (a / 255) + ")";
                ctx.lineCap = "round";
                ctx.beginPath();
                ctx.moveTo(self.lastX, self.lastY);
                ctx.lineTo(x, y);
                ctx.lineWidth = size;
                ctx.stroke();
                ctx.closePath();
                // Update the last position to reference the current position
                self.lastX = x;
                self.lastY = y;
            },

            // don't have to remove listeners because the canvas gets removed anyways...
            setListeners: function () {
                var self = this;
                var canvas = self.root.drawingCanvas._container;
                var context = canvas.getContext('2d');
                canvas.addEventListener('mousedown', function () {
                    if (self.root.Tools.currentTool == 'eraser') {
                        self.stroke = true;
                    }
                });

                canvas.addEventListener('mousemove', function (e) {
                    if (self.stroke && self.root.Tools.currentTool == 'eraser') {
                        var pos = self.root.Util.getMousePos(e.clientX, e.clientY);
                        self.mouseX = pos.x;
                        self.mouseY = pos.y;
                        self.drawLine(context, self.mouseX, self.mouseY, 35);
                    }
                }, false);

                window.addEventListener('mouseup', function (e) {
                    if (self.stroke && self.root.Tools.currentTool == 'eraser') {
                        self.stroke = false;
                        // Reset lastX and lastY to -1 to indicate that they are now invalid, since we have lifted the "pen"
                        self.lastX = -1;
                        self.lastY = -1;
                    }
                }, false);
            }
        },

        text: {
            color: '',
            name: 'text',
            state: 'addMarker',
            initialize: function () {
                var self = this;
                self.setListeners();
            },
            terminate: function () {
                var self = this;
                var comment = self.root.Comments.editingComment;
            },
            handleText: function (e) {
                var self = this;
                var comment = self.root.Comments.editingComment;
                var canvas = self.rootMapCommentTool.drawingCanvas._container;
                var marker;
            },
            setListeners: function () {
                var self = this;
                var canvas = self.root.drawingCanvas._container;
                var context = canvas.getContext('2d');
            },
            renderText: function (comment, textId, stringVal) {
            }
        }

    };

    MapCommentTool.Network = {
        lockedComments: [],
        usersViewing: [],

        init: function () {
            var self = this;
            socket.on('load comments', function (msg) {
                self.lockedComments = msg.editList;

                msg.comments.forEach(function (loadedComment) {
                    var comment = L.layerGroup();
                    comment.id = loadedComment.id;
                    var imageUrl = loadedComment.layers[0].src;
                    var imageBounds = loadedComment.layers[0]._bounds;
                    var newImage = L.imageOverlay(imageUrl, [imageBounds._southWest, imageBounds._northEast]);
                    newImage.addTo(comment);
                    newImage.layerType = 'drawing';
                    self.root.Comments.list.push(comment);
                    comment.name = loadedComment.name;
                    comment.saveState = true;
                    comment.zoomLevel = loadedComment.zoomLevel;
                    // IF CURRENTLY IN MAP VIEWING MODE
                    comment.addTo(map);
                });
                if (self.root.currentMode == 'controlBarHome') {
                    self.root.ControlBar.displayControl('home');
                }
            });
            socket.on('new comment added', function (msg) {
                var comment = L.layerGroup();
                comment.id = msg.id;
                var imageUrl = msg.layers[0].src;
                var imageBounds = msg.layers[0]._bounds;
                var newImage = L.imageOverlay(imageUrl, [imageBounds._southWest, imageBounds._northEast]);
                newImage.addTo(comment);
                newImage.layerType = 'drawing';
                self.root.Comments.list.push(comment);
                comment.saveState = true;
                comment.name = msg.name;
                comment.zoomLevel = msg.zoomLevel;

                // IF CURRENTLY IN MAP VIEWING MODE
                comment.addTo(map);

                //IF IN HOME VIEW, RELOAD COMMENT LIST
                if (self.root.currentMode == 'controlBarHome') {
                    self.root.ControlBar.displayControl('home');
                }
            });

            socket.on('comment edited', function (msg) {
                var comment;
                self.root.Comments.list.forEach(function (listComment) {
                    if (listComment.id == msg.id) {
                        comment = listComment;
                    }
                });
                comment.getLayers().forEach(function (layer) {
                    if (layer.layerType == 'drawing') {
                        comment.removeLayer(layer);
                        layer.removeFrom(map);
                    }
                });

                var imageUrl = msg.layers[0].src;
                var imageBounds = msg.layers[0]._bounds;
                var newImage = L.imageOverlay(imageUrl, [imageBounds._southWest, imageBounds._northEast]);
                newImage.addTo(comment);
                newImage.layerType = 'drawing';
                comment.zoomLevel = msg.zoomLevel;

                //IF IN HOME VIEW, RELOAD COMMENT LIST
                if (self.root.currentMode == 'controlBarHome') {
                    self.root.ControlBar.displayControl('home');
                }
            });

            socket.on('editList update', function (msg) {
                map.MapCommentTool.Network.lockedComments = msg.editList;
                //IF IN HOME VIEW, RELOAD COMMENT LIST

                if (self.root.currentMode == 'controlBarHome') {
                    self.root.ControlBar.displayControl('home');
                }
            });

            document.addEventListener("save-drawing", function (e) {
                socket.emit('save drawing', e.detail);
            });
            document.addEventListener("new-drawing", function (e) {
                socket.emit('new drawing', e.detail);
            });
            document.addEventListener("edit-start", function (e) {
                socket.emit('start edit', e.detail);
            });
            document.addEventListener("edit-cancel", function (e) {
                socket.emit('cancel edit', e.detail);
            });
        },
    };

    // return your plugin when you are done
    return MapCommentTool;
}, window));
