var SAnimModel = function() {
    this.clearModel();
}

SAnimModel.prototype.clearModel = function() {
    this._contour = [];
    this._steiner = [];
    this._nodes = [];
    this._tris = [];
    this._nnodes = 0;
    
    this._nodeidmap = [];
    this._nhandles = 0;
    
    this.ARAP = null;
}

SAnimModel.prototype.addPolygonNode = function(x, y) {
    var node = new poly2tri.Point(x, y);
    node.id = this._nnodes++;
    this._contour.push(node);
    this._nodes.push(node);
    return node;
}

SAnimModel.prototype.addInternalNode = function(x, y) {
    var node = new poly2tri.Point(x, y);
    node.id = this._nnodes++;
    this._steiner.push(node);
    this._nodes.push(node);
    return node;
}

SAnimModel.prototype.doneDrawingShape = function() {
    return this._contour.length >= 3;
}

SAnimModel.prototype.closeShape = function() {
    //
}

SAnimModel.prototype.computeTriangulation = function() {
    /* We need a copy of the contour because the SweepContext
       rearranges the order of the passed in array */
    var contourcopy = [].concat(this._contour);
    var swctx = new poly2tri.SweepContext(contourcopy);
    for (var i = 0; i < this._steiner.length; i++) {
        swctx.addPoint(this._steiner[i]);
    }
    swctx.triangulate();
    var t, triangles = swctx.getTriangles()
    for (var i = 0; i < triangles.length; i++) {
        t = triangles[i];
        this._tris.push([t.getPoint(0).id, t.getPoint(1).id, t.getPoint(2).id]);
    }
    return this._tris;
}

SAnimModel.prototype.setupHandlePicking = function() {
    this._nodeidmap = {};
    for (var i = 0; i < this._nodes.length; i++) {
        this._nodeidmap[i] = i;
    }
}

SAnimModel.prototype.isHandle = function(id) {
    return (this._nodes.length - this._nodeidmap[id]) < this._nhandles;
}

SAnimModel.prototype.addHandle = function(id) {
    var i = this._nodes.length - ++this._nhandles;
    var j = this._nodeidmap[id];
    
    if (i == j) return;

    var temp = this._nodes[i];
    this._nodes[i] = this._nodes[j];
    this._nodes[j] = temp;
    
    this._nodeidmap[temp.id] = j;
    this._nodeidmap[id] = i;
}

SAnimModel.prototype.listHandles = function() {
    var handles = [];
    for (var i = 0; i < this._nhandles; i++) {
        handles.push(this._nodes[this._nodes.length - i - 1].id);
    }
    return handles;
}

SAnimModel.prototype.doneAddingHandles = function() {
    return this._nhandles >= 2;
}

SAnimModel.prototype.precomputeAnimation = function() {
    var _abctris = [];
    for (var i = 0; i < this._tris.length; i++) {
        var tri = this._tris[i];
        _abctris.push({a: this._nodeidmap[tri[0]],
                       b: this._nodeidmap[tri[1]],
                       c: this._nodeidmap[tri[2]]});
    }
    this.ARAP = new ARAP(this._nodes, _abctris, this._nhandles);
}

SAnimModel.prototype.moveHandle = function(id, x, y) {
    var changes = [];
    changes[this._nodeidmap[id]] = {x: x, y: y};
    this.ARAP.computeNewVerts(changes);
}

SAnimModel.prototype.moveAllHandles = function(_changes) {
    var changes = [];
    for (var i in _changes) {
        changes[this._nodeidmap[i]] = _changes[i];
    }
    this.ARAP.computeNewVerts(changes);
}