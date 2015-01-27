var SAnimView = function() {
    this.nextStep = $("#nextStep");
    this.clearButton = $("#clear");
    this.tutorialButton = $("#tutorialButton");
    this.animationControls = $("#animationControls").hide();

    this.tutorial = $("#tutorial");
    
    this.animRecord = $("#animRecord");
    this.animPlay = $("#animPlay");
    this.animKeyframe = $("#animKeyframe");
    
    this._width = "100%";
    this._height = "100%";
    this.paper = Raphael(document.getElementById('stage'), this._width, this._height );
    
    this.clickevents = $("#stage");
    
    this._contour = [];
    this._steiner = [];
    this._nodes = [];
    this._tris = [];
    this._handles = [];
    
    this._rcontour = null;

    this.setTutorialPosition();

    this._SKfs = [];

    this._timerId = null;
    this._frames = [];
    this._framenum = 0;
    this._timeperframe = 1000/30;
}

SAnimView.prototype.toggleTutorial = function() {
    this.tutorial.toggleClass("enabled");
}

SAnimView.prototype.clearView = function() {
    this._contour.forEach(function(r) {
        r.r.remove();
        if (r.stem) {
            r.stem.remove();
        }
    });
    this._steiner.forEach(function(r) {
        r.r.remove();
    });
    this._nodes.forEach(function(r) {
        r.r.remove();
    });
    this._tris.forEach(function(r) {
        r.r.remove();
    });

    if (this._rcontour) {
        this._rcontour.remove();
    }

    this._contour = [];
    this._steiner = [];
    this._nodes = [];
    this._tris = [];
    this._handles = [];
    
    this._rcontour = null;

    this._SKfs.forEach(function(r) {
        r.remove();
    });
    this._SKfs = [];

    if (this._timerId) {
        clearInterval(this._timerId);
    }
    this._timerId = null;
    this._framenum = 0;
    this._frames = [];

    this.disableNextStepButton();
    this.nextStep.show();
    this.animationControls.hide();

    this.animPlay.removeClass("enabled");
    this.animRecord.removeClass("enabled");
    this.animPlay.removeClass("playing");

    this.tutorial.removeClass("step-steiner")
            .removeClass("step-handles")
            .removeClass("step-animate");

    this.clearButton.removeClass("enabled");
}

SAnimView.prototype.setTutorialPosition = function() {
    var body = $("body");
    var width = body.innerWidth(),
        height = body.innerHeight(),
        bgWidth = 400, bgHeight = 294;
    this.tutorial.css("background-position", 
        (width - bgWidth)/2 + "px " + (height - bgHeight)/2 + "px");
}

SAnimView.prototype.enableNextStepButton = function() {
    this.nextStep.addClass("enabled");
}
SAnimView.prototype.disableNextStepButton = function() {
    this.nextStep.removeClass("enabled");
}
SAnimView.prototype.hideNextStepButton = function() {
    this.nextStep.hide();
}

SAnimView.prototype._computePath = function(verts) {
    var path = "M"+(verts[0].x)+","+(verts[0].y);
    for (var i = 1; i < verts.length; i++) {
        path += "L"+(verts[i].x)+","+(verts[i].y)
    }
    path += "L"+(verts[0].x)+","+(verts[0].y);
    return path;
}

SAnimView.prototype._drawPoly = function(verts) {
    return this.paper.path(this._computePath(verts));
}
SAnimView.prototype._updatePoly = function(poly, verts) {
    poly.attr({'path': this._computePath(verts)});
}

SAnimView.prototype.getClickedPosition = function(event) {
    return {x: event.clientX, y: event.clientY};
}

SAnimView.prototype._drawNode = function(x, y) {
    return this.paper.circle(x, y, 8);
}
SAnimView.prototype._drawContourSegment = function(node1, node2) {
    return this.paper.path("M" + node1.x + "," + node1.y
                               + "L" + node2.x + "," + node2.y)
                .attr({'stroke-width': 3, stroke: '#82cef0'});
}

SAnimView.prototype.addPolygonNode = function(node) {
    this._contour.push(node);
    this._nodes.push(node);
    node.r = this._drawNode(node.x, node.y).attr({'fill':'#82cef0', 'stroke-width': 0});
    node.r.parent = node;
    if (this._contour.length > 1) {
        node.stem = this._drawContourSegment(node, this._contour[this._contour.length - 2]).toBack();
    }
    this.clearButton.addClass("enabled");
}
SAnimView.prototype.closeShape = function() {
    this._contour[0].stem = 
        this._drawContourSegment(this._contour[0], this._contour[this._contour.length - 1]).toBack();
}

SAnimView.prototype.addInternalNode = function(node) {
    this._steiner.push(node);
    this._nodes.push(node);
    node.r = this._drawNode(node.x, node.y).attr({'fill':'#ffaa54', 'stroke-width': 0});
    node.r.parent = node;
}

SAnimView.prototype.updateState = function(state, states) {
    if (state == states.ADDING_INTERNAL) {
        this.tutorial.addClass("step-steiner");
    } else if (state == states.PICKING_HANDLES) {
        this.setupHandlePicking();
        this.tutorial.addClass("step-handles");
    } else if (state == states.ANIMATING) {
        this.animationControls.slideDown();
        this.tutorial.addClass("step-animate");
    }
}

SAnimView.prototype.setupHandlePicking = function() {
    var _this = this;
    for (var i = 0; i < this._nodes.length; i++) {
        this._nodes[i].r.click(function(e) {
            _this.clickevents.trigger("pickhandle", this.parent.id);
        });
    }
}

SAnimView.prototype.addTriangulation = function(tris) {
    for (var i = 0; i < tris.length; i++) {
        this._tris[i] = tris[i];
        tris[i].r = this._drawPoly([this._nodes[tris[i][0]], 
                                    this._nodes[tris[i][1]], 
                                    this._nodes[tris[i][2]]])
                        .attr({fill: "#f5d7b8", stroke: "#ffaa54", opacity: 0.5})
                        .toBack();
    }
}

SAnimView.prototype.addHandle = function(id) {
    this._nodes[id].r.attr({'stroke-width': '6', stroke: "black"});
}

SAnimView.prototype.rebuildForAnimation = function(handles) {
    var _this = this;
    for (var i = 0; i < this._nodes.length; i++) {
        this._nodes[i].r.remove();
        if (i < this._contour.length) this._nodes[i].stem.remove();
    }
    for (var i = 0; i < this._tris.length; i++) {
        this._tris[i].r.remove();
    }
    this._rcontour = this._drawPoly(this._contour).attr({stroke: '#170a00', 'stroke-width':3,fill:'#ffaa54'});
    this._handles = handles;
    for (var i = 0; i < handles.length; i++) {
        var node = this._nodes[handles[i]];
        node.r = this._drawNode(node.x, node.y).attr({'fill':'#d26b26', 'stroke-width': 0});
        node.r.parent = node;
        node.r.drag(function(dx, dy) {
            _this.clickevents.trigger("handlemove", [this.parent.id, this.ox + dx, this.oy + dy]);
        }, function() {
            this.ox = this.attr("cx");
            this.oy = this.attr("cy");
            this.animate({opacity: .5}, 500, ">");
        }, function() {
            this.animate({opacity: 1}, 500, ">");
        });
    }
}

SAnimView.prototype.redrawShape = function() {
    this._updatePoly(this._rcontour, this._contour);
    for (var i = 0; i < this._handles.length; i++) {
        var node = this._nodes[this._handles[i]];
        node.r.attr({cx: node.x, cy: node.y});
    }
}


/// animation

SAnimView.prototype.addSpatialKeyframe = function(e) {
    var self = this;
    var clicked = this.getClickedPosition(e);
    this.animRecord.addClass("enabled");
    var kf = this.paper.circle(300, 300, 10)
        .attr({"fill": "#82cef0", "stroke-width": 4})
        .drag(function (dx, dy) {
                    this.attr({cx: this.ox + dx, cy: this.oy + dy});
            },
            function () {
                this.ox = this.attr("cx");
                this.oy = this.attr("cy");
                var changes = [];
                for (var i = 0; i < self._handles.length; i++) {
                    changes[self._handles[i]] = this.handles[i];
                }
                self.clickevents.trigger("allhandlesmove", [changes]);
                this.animate({opacity: .5}, 500, ">");
            },
            function () {
                this.animate({opacity: 1}, 500, ">");
            });
    kf.handles = [];
    var handle;
    for (var i = 0; i < this._handles.length; i++) {
        handle = this._nodes[this._handles[i]].r;
        kf.handles.push({x: handle.attr("cx"), y: handle.attr("cy")});
    }
    this._SKfs.push(kf);
}

SAnimView.prototype._weightedAvg = function(as, bs) {
    var s = 0;
    var t = 0;
    for (var i = 0; i < as.length; i++) {
        t = t + as[i]*bs[i];
        s = s + bs[i];
    }
    return t/s;
}

SAnimView.prototype._distBtw = function(a, b) {
    return math.sqrt((a.cx - b.cx)*(a.cx - b.cx) + (a.cy - b.cy)*(a.cy - b.cy));
}

SAnimView.prototype.startRecording = function() {
    if (this._SKfs.length === 0) return;
    var self = this;
    this.paper.circle(0,0,10000)
        .attr({"fill": "black", opacity: 0.1})
        .drag(function(dx, dy) {
                    this.attr({cx: this.ox + dx, cy: this.oy + dy});
                    var weights = [];
                    var changes = [];
                    var dist;
                    for (var i = 0; i < self._SKfs.length; i++) {
                        dist = self._distBtw(
                            {cx: self._SKfs[i].attr("cx"), 
                             cy: self._SKfs[i].attr("cy")},
                            {cx: this.attr("cx"), 
                             cy: this.attr("cy")});
                        if (dist === 0) return;
                        weights[i] = 1/dist;
                    }
                    for (var i = 0; i < self._handles.length; i++) {
                        var xposs = [];
                        var yposs = [];
                        for (var j = 0; j < self._SKfs.length; j++) {
                            xposs.push(self._SKfs[j].handles[i].x);
                            yposs.push(self._SKfs[j].handles[i].y);
                        }
                        changes[self._handles[i]] = {
                            "x": self._weightedAvg(xposs, weights),
                            "y": self._weightedAvg(yposs, weights)
                        }
                    }
                    self.clickevents.trigger("allhandlesmove", [changes]);
                },
                function (x, y, event) {
                    this.attr({"r":10,
                               "fill": "black",
                               "opacity": 1});
                    this.ox = event.clientX;
                    this.oy = event.clientY;
                    this.attr({cx: this.ox, cy: this.oy, opacity: .5});
                    self._frames = [];
                    self._framenum = 0;
                    this.timerId = setInterval(function() {
                        self._frames[self._framenum] = [];
                        for (var i = 0; i < self._handles.length; i++) {
                            var handle = self._nodes[self._handles[i]].r;
                            self._frames[self._framenum].push(
                                {cx: handle.attr("cx"),
                                 cy: handle.attr("cy")});
                        }
                        self._framenum++;
                    }, self._timeperframe);
                },
                function () {
                    self.animPlay.addClass("enabled");
                    clearInterval(this.timerId);
                    this.remove();
                });
}

SAnimView.prototype.togglePlaying = function() {
    if (this._frames.length === 0) return;
    if (this._timerId) {
        for (var i = 0; i < this._handles.length; i++) {
            var handle = this._nodes[this._handles[i]].r;
            handle.attr({"opacity":1});
        }
        for (var i = 0; i < this._SKfs.length; i++) {
            this._SKfs[i].attr({"opacity":1});
        }
        clearInterval(this._timerId);
        this._timerId = null;
        this.animPlay.removeClass("playing");
    } else {
        for (var i = 0; i < this._handles.length; i++) {
            var handle = this._nodes[this._handles[i]].r;
            handle.attr({"opacity":0});
        }
        for (var i = 0; i < this._SKfs.length; i++) {
            this._SKfs[i].attr({"opacity":0});
        }
        var currentframe = 0;
        var self = this;
        this._timerId = setInterval(function() {
            var changes = [];
            for (var i = 0; i < self._handles.length; i++) {
                changes[self._handles[i]] = {
                    x:self._frames[currentframe][i].cx,
                    y:self._frames[currentframe][i].cy
                };
            }
            self.clickevents.trigger("allhandlesmove", [changes]);
            if (++currentframe == self._frames.length) {
                currentframe = 0;
            }
        }, this._timeperframe);
        this.animPlay.addClass("playing");
    }
}