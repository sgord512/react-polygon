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
  polygonTranslation: Point
}

const INITIAL_POINTS = [new Point(100, 100), new Point(200, 100), new Point(160, 200)]
export default class PolygonEditor extends React.Component<{}, EditorState> {
  constructor(props: {}) {
    super(props)
    this.state = {
      state: 'complete',
      points: INITIAL_POINTS,
      polygonTranslation: new Point(0, 0)
    }

    this.prevOffsetX = 0;
    this.prevOffsetY = 0;
  }

  onVertexDrag = (ix: number, e: KonvaEventObject<DragEvent>) => {
    const points = this.state.points.slice()
    points[ix] = new Point(e.target.x(), e.target.y())
    this.setState({
      points: points,
    })
  }

  onPolygonChange = (e: KonvaEventObject<Event>) => {
    //const matrix = e.target.getAbsoluteTransform();
    this.setState((state, _) => {
      // const dX = e.target.x() - this.prevOffsetX 
      // const dY = e.target.y() - this.prevOffsetY
      // this.prevOffsetX = e.target.x();
      // this.prevOffsetY = e.target.y();
      //const delta = position.subtract(state.polygonTranslation)
      //console.log(`delta: ${dX}, ${dY}`)
      return {
        points: state.points.map(pt => pt.add(new Point(e.target.x(), e.target.y())))
      }
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
                return this.onVertexDrag(ix, e)
              }

              return <Vertex point={pt} key={ix.toString()} onDragMove={onVertexDrag} />
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
    const { points, state, polygonTranslation } = this.state
    const vertexGroup = this.renderVertices()
    
    return (
      <div className="PolygonEditor">
        <Stage width={window.innerWidth} height={window.innerHeight} _useStrictMode>
          <Layer>
            <Polygon points={points} onChange={(e: KonvaEventObject<Event>) => this.onPolygonChange(e)} x={0} y={0} />
            <Boundary points={points} closed={true} />
            {vertexGroup}
          </Layer>
        </Stage>
      </div>
    )
  }
}
