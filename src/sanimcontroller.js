var SAnimController = function(model, view) {
    this.model = model;
    this.view = view;
    
    var _this = this;
    
    this.states = {
        DRAWING_SHAPE:      0,
        ADDING_INTERNAL:    1,
        PICKING_HANDLES:    2,
        ANIMATING:          3
    };
    this.state = this.states.DRAWING_SHAPE;
    
    this.view.updateState(this.state, this.states);
    
    this.view.endDraw.click(function(e) {
        _this.endDraw();
    });
    this.view.endInterior.click(function(e) {
        _this.endInterior();
    });
    this.view.endHandles.click(function(e) {
        _this.endHandles();
    });
    this.view.clickevents.on("click", function(e) {
        _this.drawPoint(e);
    });
    this.view.clickevents.on("pickhandle", function(e, id) {
        _this.addHandle(id);
    });
    this.view.clickevents.on("handlemove", function(e, id, x, y) {
        _this.moveHandle(id, x, y);
    });
}

SAnimController.prototype.endDraw = function() {
    if (this.state == this.states.DRAWING_SHAPE &&
        this.model.doneDrawingShape()) {
        this.model.closeShape();
        this.view.closeShape();
        this.state = this.states.ADDING_INTERNAL;
        this.view.updateState(this.state, this.states);
    }
}

SAnimController.prototype.endInterior = function() {
    if (this.state == this.states.ADDING_INTERNAL) {
        var tris = this.model.computeTriangulation();
        this.view.addTriangulation(tris);
        this.state = this.states.PICKING_HANDLES;
        this.view.updateState(this.state, this.states);
        this.model.setupHandlePicking();
    }
}

SAnimController.prototype.endHandles = function() {
    if (this.state == this.states.PICKING_HANDLES) {
        var handles = this.model.listHandles();
        this.view.rebuildForAnimation(handles);
        this.model.precomputeAnimation();
        this.state = this.states.ANIMATING;
        this.view.updateState(this.state, this.states);
    }
}

SAnimController.prototype.drawPoint = function(e) {
    var clicked = this.view.getClickedPosition(e);
    if (this.state === this.states.DRAWING_SHAPE) {
        this.addPolygonNode(clicked.x, clicked.y);
    } else if (this.state === this.states.ADDING_INTERNAL) {
        this.addInternalNode(clicked.x, clicked.y);
    }
}

SAnimController.prototype.addPolygonNode = function(x, y) {
    var node = this.model.addPolygonNode(x, y);
    this.view.addPolygonNode(node);
}

SAnimController.prototype.addInternalNode = function(x, y) {
    var node = this.model.addInternalNode(x, y);
    this.view.addInternalNode(node);
}

SAnimController.prototype.addHandle = function(id) {
    if (!this.model.isHandle(id)) {
        this.model.addHandle(id);
        this.view.addHandle(id);
    }
}

SAnimController.prototype.moveHandle = function(id, x, y) {
    this.model.moveHandle(id, x, y);
    this.view.redrawShape();
}


