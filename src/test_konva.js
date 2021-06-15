/* global Konva */ 

const STATE = {
    COMPLETE: 'complete',
    COMPLETE_VERTEX_SELECTED: 'complete_vertex_selected',
    COMPLETE_VERTEX_DRAGGING: 'complete_vertex_dragging',
    COMPLETE_POLY_SELECTED: 'complete_poly_selected',
    COMPLETE_POLY_TRANSFORMING: 'complete_poly_transforming',
    COMPLETE_PLACING_BOUNDARY_VERTEX: 'complete_placing_boundary_vertex',
    INCOMPLETE: 'incomplete',
    INCOMPLETE_PLACING_VERTEX: 'incomplete_placing_vertex',
};

const DIRECTION = {
    LEFT: 'left', 
    RIGHT: 'right', 
    DOWN: 'down', 
    UP: 'up'
};

const MINIMUM_ANGLE_CHANGE = Math.PI / 2;
const MINIMUM_DISTANCE = 2;
const MAXIMUM_DISTANCE = 80;

const DELTA = 2;

function makeStateLabel(state) { 
    return '.' + state;
}

// [{x: 10, y: 20}, {x:30, y: 40}] -> [10, 20, 30, 40]
function flattenPoints(points) { 
    var arr = [];
    for (const point of points) { 
        arr = arr.concat([point.x, point.y]);
    }
    return arr;
}
function restorePoints(arr) {
    var points = [];
    for (var i = 0; i < arr.length; i += 2) {
        points.push(new Point(arr[i], arr[i+1]));
    }
    return points;
}

const INITIAL_POINTS = [new Point(100,100),new Point(200,100),new Point(160,200)];
const VERTEX_DEFAULT_COLOR = 'white';
const VERTEX_SELECTED_COLOR = 'rgba(237, 82, 61, 1)'; //'rgba(61, 128, 237, 1)';
const VERTEX_MOUSEOVER_COLOR = 'rgba(40, 191, 138, 1)';
const VERTEX_MOUSEDOWN_COLOR = 'rgba(35, 108, 82, 1)';
const POLYGON_FILL_COLOR = 'rgba(201, 201, 201, 1)';
const VERTEX_TYPE = 'vertex';

const BOUNDARY_STROKE_COLOR = 'rgba(108, 159, 241, 1)';
const BOUNDARY_STROKE_WIDTH = 3;
const BOUNDARY_STROKE_HIT_WIDTH = 8;

const VERTEX_INDEX = 2;
const BOUNDARY_INDEX = 1;
const POLYGON_INDEX = 0;

const VERTEX_RADIUS = 5;

class Vertex extends Konva.Circle {
    constructor(point, ix, editor, isProvisionalVertex) {
        super({
            radius: 5, 
            fill: VERTEX_DEFAULT_COLOR,
            stroke: 'blue',
            x: point.x,
            y: point.y,
            draggable: !isProvisionalVertex             
        });  
        //console.log('creating vertex with ix:', ix);

        this.point = point;
        this.type = 'vertex';
        this.ix = ix;
        this.editor = editor;
        this.isProvisionalVertex = isProvisionalVertex;
        this.isSelected = false;
        this.type = VERTEX_TYPE;
        if (this.isProvisionalVertex) { 
            this.listening(false);        
        } else {
            this.on('mouseover', this.onMouseover);
            this.on('mouseout', this.onMouseout);
            this.on('mousedown', this.onMousedown);
        }
    }

    updatePosition = (point) => {
        this.x(point.x);
        this.y(point.y);
    }

    onMousedown = () => {
        this.editor.transformer.nodes([]);
        if (!this.isSelected) {
            this.fill(VERTEX_MOUSEDOWN_COLOR);
        }
    }

    onMouseup = () => {
        if (!this.isSelected) {
            this.fill(VERTEX_MOUSEOVER_COLOR);
        }
    }
    
    onMouseover = () => {
        if (!this.isSelected) {
            this.fill(VERTEX_MOUSEOVER_COLOR); 
        }           
    }

    onMouseout = () => {
        if (!this.isSelected) {
            this.fill(VERTEX_DEFAULT_COLOR);
        }
    }

    place = () => {
        this.isProvisionalVertex = false;
        this.draggable(true);
        this.listening(true);
        this.editor.layer.drawHit();
        this.on('mouseover', this.onMouseover);
        this.on('mouseout', this.onMouseout);
        this.on('mousedown', this.onMousedown);
        this.on('mouseup', this.onMouseup);
    }

    select = () => {
        this.fill(VERTEX_SELECTED_COLOR);
        this.isSelected = true;        
    }

    deselect = () => {
        this.fill(VERTEX_DEFAULT_COLOR);
        this.isSelected = false;
    }

}

class PathLayer {
    // This can be made much more sophisticated. Do we want to take into account the time since the last point recorded and drop points at a constant rate, under the assumption that the user is drawing the path with roughly constant arc length per unit time, or do we want to maybe adapt to the rate that the user is drawing. We can also maintain a parallel collection of points corresponding to location where we didn't drop vertices at the cost of some memory increase. 

    // Using bezier curves might be nicer initially at the cost of making editing considerably more difficult. Also, the performance seems to degrade with 100 points or so. I don't have a clear sense of how many points we can expect users to input. 
    constructor(initialPoint) {
        this.prevPoints = [initialPoint];
    }

    // Takes in a new location, decides whether to lay a vertex at that point, and records it if so.
    recordPoint(curr) { 
        if (this.prevPoints.length > 0) { 
            const last = this.prevPoints[this.prevPoints.length - 1];
            const distance = Point.distance(curr, last);
            if (distance > MAXIMUM_DISTANCE) { 
                this._recordPoint(curr); 
                return true;
            }
            if (this.prevPoints.length > 1 && distance > MINIMUM_DISTANCE) { 
                const secondToLast = this.prevPoints[this.prevPoints.length - 2];
                const prevVec = last.subtract(secondToLast);
                const currVec = curr.subtract(last);
                const absAngle = Math.abs(Point.angle(currVec, prevVec)); 
                if (absAngle > MINIMUM_ANGLE_CHANGE) { 
                    this._recordPoint(curr);
                    return true;
                }
            }
            
        }
        return false;        
    }

    _recordPoint(curr) {
        if (this.prevPoints.length >= 2) { 
            this.prevPoints.shift();
        }         
        this.prevPoints.push(curr);
    }
}

class PolygonEditor {
    // For now, I'll start in the polygon complete state with a triangle defined by static coordinates.
    constructor(stage) { 
        // The stage on which the whole editor lives
        this.stage = stage;
        // The layer (corresponding to the canvas object) on which everything lives
        this.layer = new Konva.Layer();
        // Boundary segments
        this.boundaryGroup = new Konva.Group();
        // All the vertices
        this.vertexGroup = new Konva.Group();
        // Tracking the state
        this.state = STATE.COMPLETE;
        // The ordered list of vertices for the polygon, should always correspond to the list of points.
        this.vertices = [];
        // This is the list of visible boundary segments
        this.boundarySegments = [];
        // This is the list of points in the current polygon, and the canonical source of information about the polygon. (I think I should be able to only track vertices, but at the moment that would be a pain to set up.)
        this.points = [];
        // The object used to transform the polygon. See usage below.
        this.transformer = new Konva.Transformer();
        // The selected vertex in the COMPLETE_VERTEX_SELECTED state.
        this.selectedVertex = null;

        // This only exists while hovering to create a new vertex on the boundary of the polygon, or while placing a new vertex in an incomplete state
        this.provisionalVertex = null;

        // This is used for deciding where to add points in the freehand drawing mode.
        this.pathLayer = null;

        for (const point of this.points) {
            const vertex = new Vertex(point, this.vertices.length, this);            
            this.vertexGroup.add(vertex);            
            this.vertices.push(vertex);
        }
        this.stage.add(this.layer);
        this.layer.add(this.boundaryGroup);
        this.layer.add(this.vertexGroup);
        this.layer.add(this.transformer);

        this.refreshPolygonAndBoundary();

        this.installVertexHandlers();

        if (this.points.length === 0) { 
            this.toState(STATE.INCOMPLETE_PLACING_VERTEX);
        }
        //this.layer.toggleHitCanvas();
        const container = this.stage.container();
        container.tabIndex = 1;
        container.focus();
        container.addEventListener('keydown', this.onKeyPress);
    }

    on = (listener, event, handler) => {
        listener.on(event + makeStateLabel(this.state), handler);
    }

    removeVertex = (event) => {
        const vertex = event.target;
        this.removeFromVertexList(vertex); 
        this.updateStateIfIncomplete();
        this.refreshPolygonAndBoundary();
    }

    removeSelectedVertex = (event) => {
        this.removeFromVertexList(this.selectedVertex);
        this.selectedVertex = null;
        const incomplete = this.updateStateIfIncomplete();
        if (!incomplete) { 
            this.toState(STATE.COMPLETE);
        }
        this.refreshPolygonAndBoundary();
    }

    // Returns true if the polygon is now incomplete and transitions to the appropriate state. Otherwise returns false.
    updateStateIfIncomplete = () => {
        if (this.vertices.length === 0) { 
            this.toState(STATE.INCOMPLETE_PLACING_VERTEX);
            return true;
        } else if (this.vertices.length < 3) { 
            this.toState(STATE.INCOMPLETE);
            return true;
        }    
        return false;
    }

    cancelVertexPlacement = () => {
        this.removeFromVertexList(this.provisionalVertex);
        this.toState(STATE.INCOMPLETE);
    }

    updateVertexPosition = (event) => {
        if (this.provisionalVertex) { 
            this.provisionalVertex.destroy();
        }
        const vertex = event.target;
        vertex.point.copy(vertex.getAbsolutePosition());
        this.refreshPolygonAndBoundary(); 
    }

    onKeyPress = (event) => {
        if (this.state === STATE.COMPLETE_VERTEX_SELECTED) {
            switch (event.keyCode) { 
                case 8: // Backspace
                case 46: // Delete
                    this.removeSelectedVertex();
                    break;
                case 37: // Left arrow                                            
                    this.nudgeVertex(this.selectedVertex, DIRECTION.LEFT);
                    break;
                case 38: // Up arrow
                    this.nudgeVertex(this.selectedVertex, DIRECTION.UP);
                    break;
                case 39: // Right arrow
                    this.nudgeVertex(this.selectedVertex, DIRECTION.RIGHT);
                    break;
                case 40: // Down arrow
                    this.nudgeVertex(this.selectedVertex, DIRECTION.DOWN);
                    break;
                default:
                    return;
            }
            event.preventDefault();
        }
    }

    nudgeVertex = (vertex, direction) => { 
        const position = vertex.getAbsolutePosition();
        if (direction === DIRECTION.LEFT) { 
            position.x -= DELTA;
        } else if (direction === DIRECTION.UP) { 
            position.y -= DELTA;
        } else if (direction === DIRECTION.RIGHT) { 
            position.x += DELTA;
        } else if (direction === DIRECTION.DOWN) {
            position.y += DELTA;
        }        
        vertex.position(position);
        vertex.point.copy(position);
        this.refreshPolygonAndBoundary();
    }

    refreshBoundary = () => {
        for (const segment of this.boundarySegments) {
            segment.destroy(); 
        }
        this.boundarySegments = [];
        var boundaryPoints = this.points.slice();
        if (this.isComplete()) { 
            boundaryPoints.push(boundaryPoints[0]);
        }
        for (let ix = 0; ix < boundaryPoints.length - 1; ix++) { 
            var startPoint =  boundaryPoints[ix];
            var endPoint = boundaryPoints[ix+1];
            var segment = new Konva.Line({
                points: [startPoint.x, startPoint.y, endPoint.x, endPoint.y],
                stroke: BOUNDARY_STROKE_COLOR,
                strokeWidth: BOUNDARY_STROKE_WIDTH,
                hitStrokeWidth: BOUNDARY_STROKE_HIT_WIDTH,
            });
            segment.ix = ix;
            this.boundarySegments.push(segment);
            this.boundaryGroup.add(segment);
        }
        if (this.isComplete()) {
            this.installBoundaryHandlers();
        }
    }

    refreshPolygon = () => {
        if (this.polygon) { this.polygon.destroy(); }
        if (this.isIncomplete()) { return; }
        this.polygon = this.createPolygonFromPoints(this.points);
        this.installPolygonHandlers();
        this.layer.add(this.polygon);
        this.polygon.zIndex(0);
    }

    refreshPolygonAndBoundary = () => {
        this.refreshPolygon();
        this.refreshBoundary();
        this.verifyPolygon();
    }

    onPolygonTransform = () => {
        const matrix = this.polygon.getAbsoluteTransform();
        const points = restorePoints(this.polygon.points());
        for (var ix = 0; ix < this.points.length; ix++) { 
            this.points[ix].copy(matrix.point(points[ix]));
            this.vertices[ix].updatePosition(this.points[ix]);
        }
        this.refreshBoundary();
    }

    createProvisionalBoundaryVertex = (segment) => {
        const pointer = this.stage.getPointerPosition();                
        this.provisionalVertex = new Vertex(pointer, segment.ix, this, true);
        this.layer.drawHit();
        this.vertexGroup.add(this.provisionalVertex); 
    }

    installBoundaryHandlers = () => {
        if (this.state === STATE.COMPLETE) {
            for (const segment of this.boundarySegments) { 
                this.on(segment, 
                    'mouseover',
                    this.startPlacingBoundaryVertex
                );            
            }
        }
    }

    cancelBoundaryVertexPlacement = () => {
        const segment = this.boundarySegments[this.provisionalVertex.ix];
        this.provisionalVertex.destroy();
        this.provisionalVertex = null;
        this.toState(STATE.COMPLETE);    
    }

    updateProvisionalBoundaryVertexPosition = () => {
        const pointer = this.stage.getPointerPosition();
        this.provisionalVertex.x(pointer.x)
        this.provisionalVertex.y(pointer.y);
    }

    placeBoundaryVertex = () => {
        const segment = this.boundarySegments[this.provisionalVertex.ix];

        const newPoint = Point.fromObj(this.provisionalVertex.getAbsolutePosition());
        this.provisionalVertex.destroy();
        this.provisionalVertex = null;

        const newVertex = new Vertex(newPoint, segment.ix + 1, this);
        this.insertIntoVertexList(newVertex);
        this.vertexGroup.add(newVertex);

        this.toState(STATE.COMPLETE)
        
        this.refreshPolygonAndBoundary();

        newVertex.onMousedown();
        newVertex.startDrag();
    }

    installPolygonHandlers = () => { 
        this.polygon.on('click.transform', (event) => {
            console.log('clicked!');
            event.cancelBubble = true;
            this.transformer.nodes(this.boundarySegments.concat([this.polygon]));
            this.stage.on('click.polygon_deselect', () => {
                console.log('hi');
                this.transformer.nodes([]);
                this.stage.off('click.polygon_deselect');            
            });
        });

        this.polygon.on('transform.transform dragmove.transform',
            this.onPolygonTransform);  
        
        this.polygon.on('transformend',
            this.refreshPolygonAndBoundary);
    }

    installVertexHandlers = () => {
        if (this.state === STATE.COMPLETE ||
            this.state === STATE.COMPLETE_VERTEX_SELECTED) {
            for (const vertex of this.vertices) {
                this.on(vertex, 'dragmove', this.updateVertexPosition);
                this.on(vertex, 'dblclick', this.removeVertex); 
                if (vertex === this.selectedVertex) { 
                    this.on(vertex, 'click', this.deselectVertex);
                } else {
                    this.on(vertex, 'click', this.selectVertex);
                }
            }    
        } 
        if (this.state === STATE.INCOMPLETE) { 
            this.on(vertex, 'dragmove', this.updateVertexPosition);
        }
    }

    startDraggingVertex = (event) => {
        this.toState(STATE.COMPLETE_VERTEX_DRAGGING, event);
    }

    stopDraggingVertex = (event) => {
        this.toState(STATE.COMPLETE);
    }

    selectVertex = (event) => {        
        this.toState(STATE.COMPLETE_VERTEX_SELECTED, event);
    }

    deselectVertex = (event) => {
        this.toState(STATE.COMPLETE);
    }

    clearOldEventHandlers = () => {    
        // Need to clear event handlers for all states except the current state on all objects: stage, vertices, polygon, boundary segments.
        const currentState = this.state;
        const oldStates = Object.values(STATE).filter(state => state !== currentState);
        const eventNames = oldStates.map(state => makeStateLabel(state)).join(' ');
        this.stage.off(eventNames);
        if (this.polygon) { this.polygon.off(eventNames); }
        for (const vertex of this.vertices) { 
            vertex.off(eventNames);            
        }
        for (const segment of this.boundarySegments) { 
            segment.off(eventNames);
        }
    }

    isIncomplete = () => {
        return (
            this.state === STATE.INCOMPLETE ||
            this.state === STATE.INCOMPLETE_PLACING_VERTEX
        );
    }

    isComplete = () => { 
        return (
            this.state === STATE.COMPLETE ||
            this.state === STATE.COMPLETE_POLY_SELECTED || 
            this.state === STATE.COMPLETE_VERTEX_SELECTED || 
            this.state === STATE.COMPLETE_PLACING_BOUNDARY_VERTEX ||
            this.state === STATE.COMPLETE_VERTEX_DRAGGING || 
            this.state === STATE.COMPLETE_POLY_TRANSFORMING
        );
    }

    toState = (newState, triggerEvent) => {
        console.log(this.state + ' -> ' + newState);
        if (this.state === newState) {
            if (this.state === STATE.COMPLETE_VERTEX_SELECTED) {
                if (triggerEvent.target === this.selectedVertex) {
                    throw 'Trying to select the same vertex twice!';
                } 
                // If we're switching between selected vertices, we're fine.               
            } else {
                throw 'Invalid state transition!';
            }
        }
        // Trigger event is optional!
        this.state = newState;
        this.clearOldEventHandlers();
        if (this.selectedVertex) { 
            this.selectedVertex.deselect();
            this.selectedVertex = null;
        }

        switch (newState) {
            case STATE.INCOMPLETE:
                // for (const vertex of this.vertices) { 
                //     this.on(vertex,  'dragmove', this.updateVertexPosition);
                // }

                if (this.vertices.length >= 1) { 
                    this.on(this.vertices[0], 'click', this.startPlacingVertex);            
                    if (this.vertices.length >= 2) { 
                        this.on(this.vertices[this.vertices.length - 1], 'click', this.startPlacingVertex);
                    }
                } else { 
                    throw 'Should never get to the incomplete state with no vertices!';
                } 
                break;

            case STATE.INCOMPLETE_PLACING_VERTEX:
                // Create a vertex that we'll be placing. Only pass a vertex in if there was an event triggering this state change. (This is to distinguish this case from programmatically initiating the transition.)
                this.createProvisionalVertex(!!triggerEvent && triggerEvent.target);

                // Track mouse movements to update the placement location
                this.on(stage, 'mousemove', this.updateProvisionalVertexPosition);

                // Cancel placement on a double click anywhere
                this.on(stage, 'dblclick', this.cancelVertexPlacement);
                
                // Have vertices listen for us placing on top of them. If we close the polygon, we need to transition. Also we prohibit placement of vertices on top of each other.
                for (const vertex of this.vertices) { 
                    this.on(vertex,  'mousedown', this.placeVertex);
                } 

                // Place the vertex on a single mousedown anywhere on the stage
                this.on(stage, 'mousedown', this.placeVertex);   
                break;

            case STATE.COMPLETE:
                this.pathLayer = null;
                for (const vertex of this.vertices) { 
                    vertex.draggable(true);
                }
                this.refreshPolygonAndBoundary();
                this.installVertexHandlers();
                break;
            
            case STATE.COMPLETE_PLACING_BOUNDARY_VERTEX:
                const segment = triggerEvent.target;    
                this.createProvisionalBoundaryVertex(segment); 
                for (const vertex of this.vertices) { 
                    vertex.draggable(false);
                }
                this.on(segment, 'mousemove',
                    this.updateProvisionalBoundaryVertexPosition)
                this.on(segment, 'mouseout',
                    this.cancelBoundaryVertexPlacement); 
                this.on(segment, 'mousedown',
                    this.placeBoundaryVertex);          
                break;

            case STATE.COMPLETE_VERTEX_DRAGGING:
                const vertex = triggerEvent.target;
                this.on(vertex, 'dragmove', this.updateVertexPosition);
                this.on(vertex, 'dragend', this.stopDraggingVertex);
                break;

            case STATE.COMPLETE_VERTEX_SELECTED:
                this.selectedVertex = triggerEvent.target;
                this.selectedVertex.select();
                this.installVertexHandlers();           
                break;

            case STATE.COMPLETE_POLY_SELECTED:

            case STATE.COMPLETE_POLY_TRANSFORMING:
            default:
                throw 'Unknown state!';
        }
    }

    startPlacingVertex = (event) => {
        this.toState(STATE.INCOMPLETE_PLACING_VERTEX, event);
        event.cancelBubble = true;
    }

    startPlacingBoundaryVertex = (event) => {
        this.toState(STATE.COMPLETE_PLACING_BOUNDARY_VERTEX, event);
        event.cancelBubble = true;
    }

    // We're now going to start placing a vertex, which can be either at the beginning of end of the current polygon. 
    createProvisionalVertex = (neighborVertex) => {
        const pointer = this.stage.getPointerPosition() || {x: 0, y: 0};
        const newPoint = Point.fromObj(pointer);
        const ix = (!neighborVertex || neighborVertex.ix === 0) ? 0 : this.points.length;       
        this.provisionalVertex = new Vertex(newPoint, ix, this, true);
        this.insertIntoVertexList(this.provisionalVertex);
    }

    updateProvisionalVertexPosition = (event) => {
        const pointer = Point.fromObj(this.stage.getPointerPosition() || {x: 0, y: 0});
        var provisionalVertex = this.provisionalVertex;  
        provisionalVertex.x(pointer.x);
        provisionalVertex.y(pointer.y);
        this.points[provisionalVertex.ix].copy(provisionalVertex.getAbsolutePosition());

        if (event.evt.shiftKey) { 
            if (!this.pathLayer) { 
                this.pathLayer = new PathLayer(pointer);
            } else { 
                const placeVertex = this.pathLayer.recordPoint(pointer);
                if (placeVertex) { 
                    this.placeVertex({target: this.stage});
                }
            }
        } else { 
            this.pathLayer = null;
        }
        this.refreshPolygonAndBoundary();
    }

    placeVertex = (event) => {        
        console.log('placing vertex', event.target);
        if (event.target.type === VERTEX_TYPE) { 
            const targetVertex = event.target; 
            if (this.vertices.length > 3 && ((this.provisionalVertex.ix === 0 && targetVertex.ix === this.points.length - 1) || 
                (this.provisionalVertex.ix === this.points.length - 1 && targetVertex.ix === 0))) {
                    // We're completing the polygon, so the current vertex is now redundant and we should remove it, rather than place it.
                    this.removeFromVertexList(this.provisionalVertex);
                    this.provisionalVertex = null;
                    this.toState(STATE.COMPLETE);
                    event.cancelBubble = true;
                    return;
            } else {                 
                // We're trying to place a vertex on top of another vertex that won't close the polygon. In this case, let's just ignore the attempt to place the vertex and remain in the placement mode. In particular, we need to make sure the stage doesn't observe the event that triggered this.
                event.cancelBubble = true;
                return;
            }
        } else {
            // In this case, the call was triggered by a click on the stage directly. 

            // We're going to place the provisional vertex somewhere valid, so we just need to set it down and clear the provisional vertex, and then transition back to the incomplete_placing_vertex state.
            const placedVertex = this.provisionalVertex;
            placedVertex.place();
            this.provisionalVertex = null;
            this.toState(STATE.INCOMPLETE);
            const newEvent = {target: placedVertex};
            this.toState(STATE.INCOMPLETE_PLACING_VERTEX, newEvent);
        }
    }

    createPolygonFromPoints = (points) => {
        const pointArr = flattenPoints(points);
        const polygon = new Konva.Line({
            points: pointArr,
            fill: POLYGON_FILL_COLOR,
            closed: this.state !== STATE.INCOMPLETE,
            draggable: true,
          }); 
        return polygon;
    }

    // TODO: Remove the index from vertices! There's no reason to keep this around!
    verifyPolygon = () => {
        //console.log(this.vertices.map((v) => v.ix).join(' '));
        for (var i = 0; i < this.vertices.length; i++) { 
            const vertex = this.vertices[i];
            if (vertex.ix !== i) { 
                throw "Vertex out of order!";
            }
            if (vertex.point !== this.points[i]) { 
                throw "Vertex points out of order";
            }
        }
        if (this.points.length > this.vertices.length) { 
            throw "Too few vertices!";
        }
    }

    insertIntoVertexList = (vertex) => { 
        const ix = vertex.ix;
        const point = vertex.point;
        for (var i = ix; i < this.vertices.length; i++) { 
            this.vertices[i].ix++;            
        }
        this.points.splice(ix, 0, point);
        this.vertices.splice(ix, 0, vertex);
        this.vertexGroup.add(vertex);
    }

    removeFromVertexList = (vertex) => {
        const ix = vertex.ix;
        console.log('removing', ix);
        var diffString = '';
        for (var i = ix+1; i < this.vertices.length; i++) {
            diffString += `${i}/${this.vertices[i].ix}->${this.vertices[i].ix-1} `;
            this.vertices[i].ix--;            

        }
        console.log('updates:', diffString);
        this.points.splice(ix, 1);
        this.vertices.splice(ix, 1);
        vertex.destroy();
    }

    printVertexList = () => {
        console.log(this.vertices.map((v) => v.ix).join(' '));
    }
}

var width = window.innerWidth;
var height = window.innerHeight - 25;
var stage = new Konva.Stage({
    container: 'container', 
    width: width, 
    height: height 
});
var editor = new PolygonEditor(stage);

// This should be the highest-level object
        


    
    
    