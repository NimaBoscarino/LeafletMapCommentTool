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

        startDrawingMode: function (comment, options) {
            var self = this;
            // spawn a drawing canvas
            self.drawingCanvas = L.canvas({
                padding: 0
            });
            self.drawingCanvas.addTo(self.ownMap);

            // set canvas class
            self.drawingCanvas._container.className += " drawing-canvas";

            // set mode to "drawing"
            self.currentMode = 'drawing';
            // set toolbar view to "drawing"
            self.ControlBar.currentView = self.ControlBar.displayControl('drawing', comment);

            // Remove all comment layer groups from map
            self.Comments.list.forEach(function (_comment) {
                _comment.removeFrom(self.ownMap);
            });

            self.Comments.editingComment = comment;

            // turn on all drawing tools
            if (options) {
                self.Tools.on(options);
            } else {
                self.Tools.on();
            }
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

        displayControl: function (mode, comment) {
            var self = this;
            // clear the display
            L.DomUtil.empty(self._container);

            switch (mode) {
                case 'home':
                    self.homeView();
                    break;
                case 'drawing':
                    self.drawingView(comment);
                    break;
                default:
            }

            return mode;
            //
        },

        homeView: function () {
            var self = this;

            var homeView = L.DomUtil.create('div', 'controlbar-view controlbar-home', self._container);
            var close = this._closeButton = L.DomUtil.create('a', 'close', homeView);
            close.innerHTML = '&times;';
            close.onclick = function () {
                self.hide();
            };
            var br = L.DomUtil.create('br', '', homeView);
            var newCommentButton = L.DomUtil.create('a', 'new-comment', homeView);
            newCommentButton.innerHTML = "New Comment";
            newCommentButton.onclick = function () {
                return self.startNewComment();
            };

            var commentListDiv = L.DomUtil.create('div', 'comments-div', homeView);

            if (self.root.Comments.list.length > 0) {
                var commentList = L.DomUtil.create('ul', 'collection', commentListDiv);
                self.root.Comments.list.forEach(function (comment) {
                    var commentItem = L.DomUtil.create('li', 'collection-item', commentList);
                    var commentName = L.DomUtil.create('span', '', commentItem);
                    commentName.innerHTML = comment.name;

                    // add view button later

                    var commentEdit = L.DomUtil.create('a', 'edit-button', commentItem);

                    var image;
                    comment.getLayers().forEach(function (layer) {
                        if (layer.layerType == 'drawing') {
                            image = layer;
                        }
                    });

                    commentEdit.innerHTML = "EDIT";
                    if (self.root.Network.lockedComments.indexOf(comment.id) > -1) {
                        commentEdit.className += " disabled"
                    } else {
                        commentEdit.onclick = function () {
                            return self.editComment(comment, image);
                        };
                    }
                });
            }
        },

        drawingView: function (comment) {
            var self = this;
            var drawingView = L.DomUtil.create('div', 'controlbar-view controlbar-home', self._container);
            var close = this._closeButton = L.DomUtil.create('a', 'close', drawingView);
            close.innerHTML = '&times;';
            close.onclick = function () {
                self.saveDrawing(comment, { closeSave: true });
            };
            var br = L.DomUtil.create('br', '', drawingView);

            var toolbox = L.DomUtil.create('div', 'toolbox', drawingView);

            var redPenSelectButton = L.DomUtil.create('img', 'tool', toolbox);
            redPenSelectButton.src = 'assets/red-pen.png';
            redPenSelectButton.onclick = function () {
                self.root.Tools.setCurrentTool('pen', {
                    colour: 'red'
                });
            };

            var yellowPenSelectButton = L.DomUtil.create('img', 'tool', toolbox);
            yellowPenSelectButton.src = 'assets/yellow-pen.png';
            yellowPenSelectButton.onclick = function () {
                self.root.Tools.setCurrentTool('pen', {
                    colour: 'yellow'
                });
            };

            var blackPenSelectButton = L.DomUtil.create('img', 'tool', toolbox);
            blackPenSelectButton.src = 'assets/black-pen.png';
            blackPenSelectButton.onclick = function () {
                self.root.Tools.setCurrentTool('pen', {
                    colour: 'black'
                });
            };

            var eraserSelectButton = L.DomUtil.create('img', 'tool', toolbox);
            eraserSelectButton.src = 'assets/eraser.png';
            eraserSelectButton.onclick = function () {
                self.root.Tools.setCurrentTool('eraser');
            };

            var textSelectButton = L.DomUtil.create('img', 'tool', toolbox);
            textSelectButton.src = 'assets/text.png';
            textSelectButton.onclick = function () {
                self.root.Tools.setCurrentTool('text');
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

        editComment: function (comment, image, options) {
            var self = this;
            // fly to comment
            //map.flyToBounds(image._bounds, {animate: false});

            // trigger drawing mode
            if (options) {
                self.root.startDrawingMode(comment, options);
            } else {
                self.root.startDrawingMode(comment);
            }
            self.root.Comments.editingComment = comment;
            var canvas = self.root.drawingCanvas._container;
            var context = canvas.getContext('2d');
            var canvasTransformArray;

            // for phantomJS
            if (self.root.PHANTOMTEST) {
                canvasTransformArray = [0, 0];
            } else {
                canvasTransformArray = canvas.style.transform.split(/,|\(|\)|px| /);
            }

            if (image) {
                var imageObj = new Image();

                var newWidth = image._image.width * self.root.ownMap.getZoomScale(self.root.ownMap.getZoom(), comment.zoomLevel);
                var newHeight = image._image.height * self.root.ownMap.getZoomScale(self.root.ownMap.getZoom(), comment.zoomLevel);

                imageObj.onload = function () {
                    context.drawImage(imageObj, image._image._leaflet_pos.x, image._image._leaflet_pos.y, newWidth, newHeight);
                };

                imageObj.src = image._image.src;
            }

            var eventDetails = {
                "detail": {
                    "comment": {
                        "id": comment.id,
                    },
                }
            };
            event = new CustomEvent("editCommentStart", eventDetails);
            document.dispatchEvent(event);

            return comment;
        },

        saveDrawing: function (comment, options) {
            var self = this;
            var isNew = !comment.saveState;

            // prompt for title saving...
            if (!comment.saveState) {
                comment.name = prompt("Please name your note", "Note") || "Note";
            }
            comment.zoomLevel = self.root.ownMap.getZoom();

            if (options && options.textSave) {
                console.log('saving text, so special case');
            } else {
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

                        if (options && options.closeSave) {
                            console.log('saved and closed, alert server');
                            console.log('is old!!!!');
                            // alert the server to update the editList
                            var editListComment = {
                                id: comment.id,
                            };

                            var event = new CustomEvent('editCommentEnd', {
                                'detail': {
                                    comment: editListComment
                                }
                            });
                            document.dispatchEvent(event);

                            // alert the server with the updated comment
                            // serialize updated comment
                            var updatedComment = {
                                id: comment.id,
                                name: comment.name,
                                drawing: {
                                    dataUrl: mergedDrawing,
                                    bounds: {
                                        northEast: {
                                            lat: newNorthEast.lat,
                                            lng: newNorthEast.lng
                                        },
                                        southWest: {
                                            lat: newSouthWest.lat,
                                            lng: newSouthWest.lng
                                        }
                                    }
                                },
                                textAnnotations: []
                            };

                            // populate textAnnotations array
                            comment.textLayerGroup.getLayers().forEach(function (layer) {
                                var textAnnotation = {
                                    textDrawing: {
                                        dataUrl: layer.dataUrl,
                                        bounds: layer.bounds,
                                        textId: layer.textId
                                    },
                                    textId: layer.textId,
                                    latlng: {
                                        lat: layer._latlng.lat,
                                        lng: layer._latlng.lng
                                    },
                                    textVal: layer.textVal,
                                    textZoomLevel: layer.textZoomLevel
                                }

                                updatedComment.textAnnotations.push(textAnnotation);
                            });


                            event = new CustomEvent('saveComment', {
                                'detail': {
                                    comment: updatedComment
                                }
                            });
                            document.dispatchEvent(event);


                        }
                    };
                    oldImageToCanvas.src = oldDrawing._url;
                } else {
                    // serialize comment
                    // and alert the server with the new comment
                    if (isNew) {
                        var sendComment = {
                            id: comment.id,
                            name: comment.name,
                            drawing: {
                                dataUrl: canvasDrawing,
                                bounds: {
                                    northEast: {
                                        lat: imageBoundsMaxCoord.lat,
                                        lng: imageBoundsMaxCoord.lng
                                    },
                                    southWest: {
                                        lat: imageBoundsMinCoord.lat,
                                        lng: imageBoundsMinCoord.lng
                                    }
                                }
                            }
                        };

                        var event = new CustomEvent('newComment', {
                            'detail': {
                                comment: sendComment
                            }
                        });
                        document.dispatchEvent(event);
                    }
                }
            }

            self.root.stopDrawingMode();

            comment.saveState = true;

            if (options && options.textSave) {
                var image;
                comment.getLayers().forEach(function (layer) {
                    if (layer.layerType == 'drawing') {
                        image = layer;
                    }
                });
                self.editComment(comment, image);
            }
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
        editingComment: '',

        saved: function (comment) {
            var self = this;
            return comment.saveState;
        },

        newComment: function () {
            var self = this;
            var comment = L.layerGroup();
            comment.saveState = false;
            comment.id = self.root.Util.generateGUID();
            comment.textLayerGroup = L.layerGroup();
            self.editingComment = comment;
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

        cropImageFromCanvas: function (ctx, canvas) {
            var w = canvas.width,
            h = canvas.height,
            pix = { x: [], y: [] },
            imageData = ctx.getImageData(0, 0, canvas.width, canvas.height),
            x, y, index;

            for (y = 0; y < h; y++) {
                for (x = 0; x < w; x++) {
                    index = (y * w + x) * 4;
                    if (imageData.data[index + 3] > 0) {
                        pix.x.push(x);
                        pix.y.push(y);
                    }
                }
            }
            pix.x.sort(function (a, b) { return a - b });
            pix.y.sort(function (a, b) { return a - b });
            var n = pix.x.length - 1;

            w = pix.x[n] - pix.x[0] + 5;
            h = pix.y[n] - pix.y[0] + 5;
            var cut = ctx.getImageData(pix.x[0] - 3, pix.y[0] - 3, w, h);

            canvas.width = w;
            canvas.height = h;
            ctx.putImageData(cut, 0, 0);

            var image = canvas.toDataURL();
            return image;
        },

        deserializeCommentFromArrayForm: function (arrayComment) {
            var self = this;

            var comment = {};

            self.recursiveTraverse(comment, arrayComment, 0)

            return comment;
        },

        recursiveTraverse: function (comment, array, index) {
            // Recrusiverly traverse through the Name, Value array and turn it into an object
            var self = this;
            if (!Array.isArray(array[index].Value)) {
                comment[array[index].Name] = array[index].Value;
            } else if (comment) {
                comment[array[index].Name] = {};
                self.recursiveTraverse(comment[array[index].Name], array[index].Value, 0);
            }


            if (index < array.length - 1) {
                self.recursiveTraverse(comment, array, index + 1);
            }
        }
    };

    MapCommentTool.Tools = {
        currentTool: '',
        toolList: ['pen', 'eraser', 'text'],
        defaultTool: 'pen',

        on: function (options) {
            var self = this;
            self.pen.root = self.root;
            self.eraser.root = self.root;
            self.text.root = self.root;

            if (!options) {
                self.pen.setListeners();
                self.eraser.setListeners();
                self.text.setListeners();

                // add all text images
                self.root.Comments.editingComment.getLayers().forEach(function (layer) {
                    if (layer.layerType == 'textDrawing') {
                        layer.addTo(self.root.ownMap);
                        layer._image.addEventListener('onmouseover', function () {
                            console.log('mouse me')
                        });
                    }
                });
            } else {
                var canvas = self.root.drawingCanvas._container;
                var clickCanvasEndText = function (e) {
                    console.log('exiting text mode');
                    options.textAreaMarker.removeFrom(self.root.ownMap);
                    canvas.removeEventListener('click', clickCanvasEndText, false);
                    self.root.Tools.on();
                    self.root.Comments.editingComment.addTo(self.root.ownMap);
                    // save everything (with options)

                    self.root.ControlBar.saveDrawing(self.root.Comments.editingComment, { textSave: true });
                }
                canvas.addEventListener('click', clickCanvasEndText, false);
            }

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
                self.root.ownMap.getPane('markerPane').style['z-index'] = 300;
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
                self.root.ownMap.getPane('markerPane').style['z-index'] = 600;
            },
            terminate: function () {
                var self = this;
                self.root.ownMap.getPane('markerPane').style['z-index'] = 300;
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
                var comment = self.root.Comments.editingComment;
                var image;
                var id;
                var textBox;
                var marker;
                comment.getLayers().forEach(function (layer) {
                    if (layer.layerType == 'drawing') {
                        image = layer;
                    }
                });

                var inputRenderText = function (e) {
                    self.renderText(comment, id, textBox.value, marker);
                }

                var clickAddText = function (e) {
                    if (self.root.Tools.currentTool == 'text') {
                        canvas = self.root.drawingCanvas._container;

                        var coords = self.root.ownMap.containerPointToLatLng([e.layerX, e.layerY]);

                        // needs to be added to a layer group for text... not to map
                        comment.textLayerGroup.getLayers().forEach(function (layer) {
                            layer.removeFrom(self.root.ownMap);
                        });

                        id = self.root.Util.generateGUID();

                        var myIcon = L.divIcon({
                            className: 'text-comment-div',
                            html: '<textarea id="' + id + '" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" class="text-comment-input" rows="6" cols="30" maxlength="130"></textarea>'
                        });

                        marker = L.marker(coords, {
                            icon: myIcon
                        });
                        marker.textId = id;
                        marker.addTo(comment.textLayerGroup);
                        marker.addTo(self.root.ownMap);
                        marker.layerType = 'textAreaMarker';
                        self.root.ControlBar.saveDrawing(comment);
                        self.root.ownMap.setView(marker._latlng, map.getZoom(), { animate: false });
                        self.root.ownMap.panBy([200, 150], { animate: false });

                        // start editing again
                        // ...

                        self.root.ControlBar.editComment(comment, image, { addText: true, textAreaMarker: marker });
                        self.root.Tools.setCurrentTool('text', { listeners: false });
                        textBox = document.getElementById(id);
                        textBox.focus();
                        textBox.addEventListener('input', inputRenderText, false);
                    }
                }

                canvas.addEventListener('click', clickAddText, false);
            },
            renderText: function (comment, textId, val, marker) {
                var self = this;
                var textBox = document.getElementById(textId);
                var boundingRect = textBox.getBoundingClientRect();
                var textDrawingImage;
                //remove old drawing
                comment.getLayers().forEach(function (layer) {
                    if (layer.layerType == 'textDrawing' && layer.textId == textId) {
                        comment.removeLayer(layer);
                        layer.removeFrom(self.root.ownMap);
                        textDrawingImage = layer;
                    }
                });

                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d');
                //hardcoded for now
                canvas.height = 1000;
                canvas.width = 1000;
                var lineHeight = 25;
                var colWidth = 18;
                ctx.font = "30px monospace";
                var col = 0;
                var row = 0;

                // parsing every character, this is going to turn into a beast
                val.split('').forEach(function (splitChar) {
                    ctx.fillText(splitChar, col * colWidth, (row + 1) * lineHeight); // figure out the relationship between this offset and the font size....
                    col++;
                    if ((col == 30) || splitChar == '\n') {
                        col = 0;
                        row++;
                    }
                });

                var img = new Image();

                img.onload = function () {
                    self.placeText({
                        marker: marker,
                        img: img,
                        textId: textId,
                        val: val,
                        textDrawingImage: textDrawingImage,
                        comment: comment,
                    });
                };

                img.src = self.root.Util.cropImageFromCanvas(ctx, canvas);
            },

            placeText: function (args) {
                var self = this; // I should get this tattooed on my forehead.

                var marker = args.marker;
                var img = args.img;
                var textId = args.textId;
                var val = args.val;
                var textDrawingImage = args.textDrawingImage;
                var comment = args.comment;

                var markerToPoint = self.root.ownMap.latLngToLayerPoint(marker._latlng);
                var southWest = self.root.ownMap.layerPointToLatLng([markerToPoint.x + img.width, markerToPoint.y + img.height]);
                var northEast = marker._latlng;
                var newTextImageOverlay = L.imageOverlay(img.src, [southWest, northEast], { interactive: true, pane: 'markerPane' });
                newTextImageOverlay.layerType = 'textDrawing';
                newTextImageOverlay.textId = textId;

                marker.bounds = {
                    northEast: northEast,
                    southWest: southWest,
                }
                marker.dataUrl = img.src;
                marker.textVal = val;
                marker.textZoomLevel = map.getZoom();

                // eraser listeners
                newTextImageOverlay.on('mouseover', function () {
                    if (self.root.Tools.currentTool == 'eraser') {
                        L.DomUtil.addClass(newTextImageOverlay._image, 'text-hover-erase');
                    }
                });
                newTextImageOverlay.on('mouseout', function () {
                    if (self.root.Tools.currentTool == 'eraser') {
                        L.DomUtil.removeClass(newTextImageOverlay._image, 'text-hover-erase');
                    }
                });
                newTextImageOverlay.on('click', function () {
                    if (self.root.Tools.currentTool == 'eraser') {
                        // this thing is a mess
                        comment.removeLayer(newTextImageOverlay);
                        comment.textLayerGroup.removeLayer(marker);
                        comment.removeLayer(textDrawingImage);
                        textDrawingImage.removeFrom(self.root.ownMap);
                        newTextImageOverlay.removeFrom(self.root.ownMap);
                        console.log(comment);
                    }
                });

                // text tool listeners (for editing)
                newTextImageOverlay.on('mouseover', function () {
                    if (self.root.Tools.currentTool == 'text') {
                        L.DomUtil.addClass(newTextImageOverlay._image, 'text-hover-edit');
                    }
                });
                newTextImageOverlay.on('mouseout', function () {
                    if (self.root.Tools.currentTool == 'text') {
                        L.DomUtil.removeClass(newTextImageOverlay._image, 'text-hover-edit');
                    }
                });
                newTextImageOverlay.on('click', function () {
                    if (self.root.Tools.currentTool == 'text') {
                        L.DomUtil.removeClass(newTextImageOverlay._image, 'text-hover-edit');

                        self.root.ControlBar.saveDrawing(comment);
                        self.root.ownMap.setView(marker._latlng, marker.textZoomLevel, { animate: false });
                        self.root.ownMap.panBy([200, 150], { animate: false });

                        newTextImageOverlay.removeFrom(self.root.ownMap);

                        comment.textLayerGroup.getLayers().forEach(function (layer) {
                            if (layer.layerType == 'textAreaMarker' && layer.textId == textId) {
                                layer.addTo(self.root.ownMap);
                                var inputBox = document.getElementById(textId);
                                inputBox.value = layer.textVal;
                                inputBox.focus();

                                var inputRenderText = function (e) {
                                    self.renderText(comment, textId, inputBox.value, layer);
                                }

                                var image;
                                comment.getLayers().forEach(function (layer) {
                                    if (layer.layerType == 'drawing') {
                                        image = layer;
                                    }
                                });

                                self.root.ControlBar.editComment(comment, image, { addText: true, textAreaMarker: marker });
                                self.root.Tools.setCurrentTool('text', { listeners: false });

                                inputBox.addEventListener('input', inputRenderText, false);
                            }
                        });
                    }
                });

                comment.addLayer(newTextImageOverlay);
            }
        }
    };

    MapCommentTool.Network = {
        lockedComments: [],
        usersViewing: [],

        init: function () {
            var self = this;
            console.log('init network stuff');
            var con = $.hubConnection();
            var hub = con.createHubProxy('networkComment');

            /** Loading Comment Functions **/

            var loadInitComments = function(commentList) {
                commentList.forEach(function (commentEntry) {
                    var comment = self.root.Util.deserializeCommentFromArrayForm(commentEntry);
                    console.log(comment);
                });
            }

            var setLockedComments = function (editList) {
                self.lockedComments = editList;
                // also trigger redrawing of home view if client is not currently in drawing mode
                //
            }


            // this client has created a new comment
            document.addEventListener('newComment', function (e) {
                console.log('alert hub for newComment');
                console.log(e.detail.comment);
                hub.invoke('newComment', e.detail.comment);
            }, false);

            // this client has executed "SAVE" on a comment that is not new
            document.addEventListener('saveComment', function (e) {
                console.log('alert hub for saveComment');
                console.log(e.detail.comment);
                hub.invoke('saveComment', e.detail.comment);
            }, false);

            // this client has begun editing a comment
            document.addEventListener('editCommentStart', function (e) {
                console.log('alert hub for editCommentStart');
                hub.invoke('editCommentStart', e.detail.comment);
            }, false);

            // this client has ended editing a comment
            document.addEventListener('editCommentEnd', function (e) {
                console.log('alert hub for editCommentEnd');
                hub.invoke('editCommentEnd', e.detail.comment);
            }, false);

            // display messages from the hub
            hub.on('onGetMessage', function (i) {
                console.log(i);
            });

            // a new comment has been created by another client
            hub.on('onNewComment', function (newComment) {
                console.log('new comment added by another client');
                console.log(newComment);
            });
            
            // a comment has been saved by another client (i.e. there is an update to load)
            hub.on('onSaveComment', function (savedComment) {
                console.log('a comment has been edited by another client');
                console.log(savedComment);
            });

            // the editList has been updated (something has been edited and saved, or a client has closed connection while editing)
            hub.on('onUpdateEditList', function (newEditList) {
                console.log('update edit list');
                console.log(newEditList);
            });

            // load it all up
            hub.on('onInitialLoad', function (editList, commentList) {
                console.log('received big old package of everything');
                console.log(editList, commentList);

                // setLockedComments(editList);
                loadInitComments(commentList);
            });

            // verify connection to server, and server to database
            con.start(function () {
                hub.invoke('getMessage');
                hub.invoke('initialLoad');
            });
        },
    };

    // return your plugin when you are done
    return MapCommentTool;
}, window));