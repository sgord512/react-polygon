import React from 'react'
import './App.css'
//import Konva from 'konva';
import { Group, Layer, Stage } from 'react-konva'
import { Point } from './Point'
import { Vertex, Polygon, Boundary } from './Shapes'
import { KonvaEventObject } from 'konva/lib/Node'

export interface EditorState {
  state:
    | 'complete'
    | 'complete_vertex_selected'
    | 'complete_vertex_dragging'
    | 'complete_poly_selected'
    | 'complete_poly_transforming'
    | 'complete_placing_boundary_vertex'
    | 'incomplete'
    | 'incomplete_placing_vertex'
    | 'complete_vertex_hover'
    | 'complete_vertex_selected_hover'
    | 'complete_vertex_mousedown'
    | 'complete_vertex_selected_mousedown'
    | 'complete_vertex_hover'
    | 'incomplete_vertex_selected'
  points: Point[]
}

const INITIAL_POINTS = [new Point(100, 100), new Point(200, 100), new Point(160, 200)]
export default class PolygonEditor extends React.Component<{}, EditorState> {
  constructor(props: {}) {
    super(props)
    this.state = {
      state: 'complete',
      points: INITIAL_POINTS,
    }
  }

  onVertexDrag = (ix: number, e: KonvaEventObject<DragEvent>) => {
    const points = this.state.points;
    points[ix].x = e.target.x();
    points[ix].y = e.target.y();
    this.setState({
      points: points
    })
  }

  onPolygonChange = (e: KonvaEventObject<Event>) => {
    const points = this.state.points;
    //const matrix = e.target.getAbsoluteTransform();
    const position = Point.fromObj(e.target.getAbsolutePosition());
    console.log(`position: ${position.x}, ${position.y}`)
    this.setState({
      points: points.map((pt) => position.add(pt))
      //points: points.map((pt) => Point.fromObj(matrix.point(pt)))
    })
  }

  renderVertices = () => {
    const { state, points } = this.state
    switch (state) {
      case 'complete':
      case 'complete_placing_boundary_vertex':
      case 'complete_poly_selected':
      case 'complete_poly_transforming':
        return (
          <Group>
            {points.map((pt, ix) => {
              const onVertexDrag = (e: KonvaEventObject<DragEvent>) => {
                return this.onVertexDrag(ix, e);
              }

              return (
                <Vertex
                  point={pt}
                  key={ix.toString()}
                  onDragMove={onVertexDrag}
                />
              )
            })}
          </Group>
        )
      case 'complete_vertex_dragging':
        break
      case 'complete_vertex_selected':
        break
      case 'complete_vertex_selected_hover':
        break
      case 'complete_vertex_hover':
        break
      case 'complete_vertex_mousedown':
        break
      case 'incomplete':
        break
      case 'incomplete_placing_vertex':
        break
      case 'incomplete_vertex_selected':
        break
      default:
        return null
    }
  }

  render = () => {
    const { points, state } = this.state
    const vertexGroup = this.renderVertices()
    // case STATE.INCOMPLETE:
    //           if (this.vertices.length >= 1) {
    //               this.on(this.vertices[0], 'click', this.startPlacingVertex);
    //               if (this.vertices.length >= 2) {
    //                   this.on(this.vertices[this.vertices.length - 1], 'click', this.startPlacingVertex);
    //               }
    //           } else {
    //               throw 'Should never get to the incomplete state with no vertices!';
    //           }
    //           break;

    //       case STATE.INCOMPLETE_PLACING_VERTEX:
    //           // Create a vertex that we'll be placing. Only pass a vertex in if there was an event triggering this state change. (This is to distinguish this case from programmatically initiating the transition.)
    //           this.createProvisionalVertex(!!triggerEvent && triggerEvent.target);

    //           // Track mouse movements to update the placement location
    //           this.on(stage, 'mousemove', this.updateProvisionalVertexPosition);

    //           // Cancel placement on a double click anywhere
    //           this.on(stage, 'dblclick', this.cancelVertexPlacement);

    //           // Have vertices listen for us placing on top of them. If we close the polygon, we need to transition. Also we prohibit placement of vertices on top of each other.
    //           for (const vertex of this.vertices) {
    //               this.on(vertex,  'mousedown', this.placeVertex);
    //           }

    //           // Place the vertex on a single mousedown anywhere on the stage
    //           this.on(stage, 'mousedown', this.placeVertex);
    //           break;

    //       case STATE.COMPLETE:
    //           this.pathLayer = null;
    //           for (const vertex of this.vertices) {
    //               vertex.draggable(true);
    //           }
    //           this.refreshPolygonAndBoundary();
    //           this.installVertexHandlers();
    //           break;

    //       case STATE.COMPLETE_PLACING_BOUNDARY_VERTEX:
    //           const segment = triggerEvent.target;
    //           this.createProvisionalBoundaryVertex(segment);
    //           for (const vertex of this.vertices) {
    //               vertex.draggable(false);
    //           }
    //           this.on(segment, 'mousemove',
    //               this.updateProvisionalBoundaryVertexPosition)
    //           this.on(segment, 'mouseout',
    //               this.cancelBoundaryVertexPlacement);
    //           this.on(segment, 'mousedown',
    //               this.placeBoundaryVertex);
    //           break;

    //       case STATE.COMPLETE_VERTEX_DRAGGING:
    //           const vertex = triggerEvent.target;
    //           this.on(vertex, 'dragmove', this.updateVertexPosition);
    //           this.on(vertex, 'dragend', this.stopDraggingVertex);
    //           break;

    //       case STATE.COMPLETE_VERTEX_SELECTED:
    //           this.selectedVertex = triggerEvent.target;
    //           this.selectedVertex.select();
    //           this.installVertexHandlers();
    //           break;

    //       case STATE.COMPLETE_POLY_SELECTED:

    //       case STATE.COMPLETE_POLY_TRANSFORMING:
    //       default:
    //           throw 'Unknown state!';
    //   }
    return (
      <div className="PolygonEditor">
        <Stage width={window.innerWidth} height={window.innerHeight} _useStrictMode>
          <Layer>
            <Polygon points={points} onChange={(e: KonvaEventObject<Event>) => this.onPolygonChange(e)}/>
            <Boundary points={points} closed={true}/>
            {vertexGroup}
          </Layer>
        </Stage>
      </div>
    )
  }
}
