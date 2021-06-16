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
  polygonKey: number
}

const o = 300
const INITIAL_POINTS = [new Point(100, 100), new Point(200, 100), new Point(160, 200)]

export default class PolygonEditor extends React.Component<{}, EditorState> {
  constructor(props: {}) {
    super(props)
    this.state = {
      state: 'complete',
      points: INITIAL_POINTS,
      polygonTranslation: new Point(0, 0),
      polygonKey: 0,
    }
    this.key = 0
  }

  componentDidMount() {
    setTimeout(() => {
      const points = [new Point(o + 100, o + 100), new Point(o + 200, o + 100), new Point(o + 160, o + 200)]
      this.key = 1
      this.setState({ points })
    }, 1000)
  }

  onVertexDrag = (ix: number, e: KonvaEventObject<DragEvent>) => {
    const points = this.state.points.slice()
    points[ix] = new Point(e.target.x(), e.target.y())
    this.setState({ points })
  }

  onPolygonChange = (e: KonvaEventObject<Event>) => {
    const points = this.state.points.map(pt => pt.add(new Point(e.evt.movementX, e.evt.movementY)))
    this.setState({ points })
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
    const { points, state, polygonTranslation, polygonKey } = this.state
    const vertexGroup = this.renderVertices()

    return (
      <div className="PolygonEditor">
        <Stage width={window.innerWidth} height={window.innerHeight} _useStrictMode>
          <Layer>
            <Polygon points={points} draggable={false} />
            <Polygon
              key={polygonKey}
              fill="rgba(0, 0, 0, 0)"
              points={points}
              onDragMove={(e: KonvaEventObject<Event>) => this.onPolygonChange(e)}
              onDragEnd={e => this.setState(state => ({ polygonKey: state.polygonKey + 1 }))}
            />
            <Boundary points={points} closed={true} />
            {vertexGroup}
          </Layer>
        </Stage>
      </div>
    )
  }
}
