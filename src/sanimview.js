var SAnimView = function() {
    this.endDraw = $("#endDraw");
    this.endInterior = $("#endInterior");
    this.endHandles = $("#endHandles");
    this.animationControls = $("#animationControls");
    
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
    return this.paper.circle(x, y, 12);
}
SAnimView.prototype._drawContourSegment = function(node1, node2) {
    return this.paper.path("M" + node1.x + "," + node1.y
                               + "L" + node2.x + "," + node2.y);
}

SAnimView.prototype.addPolygonNode = function(node) {
    this._contour.push(node);
    this._nodes.push(node);
    node.r = this._drawNode(node.x, node.y).attr({'fill':'red'});
    node.r.parent = node;
    if (this._contour.length > 1) {
        node.stem = this._drawContourSegment(node, this._contour[this._contour.length - 2]).toBack();
    }
}
SAnimView.prototype.closeShape = function() {
    this._contour[0].stem = 
        this._drawContourSegment(this._contour[0], this._contour[this._contour.length - 1]).toBack();
}

SAnimView.prototype.addInternalNode = function(node) {
    this._steiner.push(node);
    this._nodes.push(node);
    node.r = this._drawNode(node.x, node.y).attr({'fill':'blue'});
    node.r.parent = node;
}

SAnimView.prototype.updateState = function(state, states) {
    if (state == states.DRAWING_SHAPE) {
        this.endDraw.hide().slideDown();
        this.endInterior.hide();
        this.endHandles.hide();
        this.animationControls.hide();
    } else if (state == states.ADDING_INTERNAL) {
        this.endDraw.fadeOut();
        this.endInterior.slideDown();
    } else if (state == states.PICKING_HANDLES) {
        this.endInterior.fadeOut();
        this.endHandles.slideDown();
        this.setupHandlePicking();
    } else if (state == states.ANIMATING) {
        this.endHandles.fadeOut();
        this.animationControls.slideDown();
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
                        .attr({fill: "gray", opacity: 0.5})
                        .toBack();
    }
}

SAnimView.prototype.addHandle = function(id) {
    this._nodes[id].r.attr({'fill': 'black'});
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
    this._rcontour = this._drawPoly(this._contour).attr({'stroke-width':3,fill:'orange'});
    this._handles = handles;
    for (var i = 0; i < handles.length; i++) {
        var node = this._nodes[handles[i]];
        node.r = this._drawNode(node.x, node.y).attr({'fill':'blue'});
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
