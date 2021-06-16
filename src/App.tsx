import React from 'react'
import './App.css'
//import Konva from 'konva';
import { Group, Layer, Stage, Transformer } from 'react-konva'
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
  isPolygonSelected: boolean
}

const INITIAL_POINTS = [new Point(100, 100), new Point(200, 100), new Point(160, 200)]

export default class PolygonEditor extends React.Component<{}, EditorState> {
  polygonRef: React.RefObject<typeof Polygon>
  transformerRef: React.RefObject<Transformer<any, any>>

  constructor(props: {}) {
    super(props)
    this.state = {
      state: 'complete',
      points: INITIAL_POINTS,
      isPolygonSelected: false,
    }
    this.polygonRef = React.createRef<typeof Polygon>()
    this.transformerRef = React.createRef<Transformer>()
  }

  componentDidUpdate = (prevProps, prevState: EditorState, snapshot) => {
    if (!prevState.isPolygonSelected && this.state.isPolygonSelected) {
      this.transformerRef.current.nodes([this.polygonRef.current])
      this.transformerRef.current.getLayer().batchDraw()
    }
  }

  onVertexDrag = (ix: number, e: KonvaEventObject<DragEvent>) => {
    const points = this.state.points.slice()
    points[ix] = new Point(e.target.x(), e.target.y())
    this.setState({ points: points, isPolygonSelected: false })
  }

  onPolygonDrag = (e: KonvaEventObject<DragEvent>) => {
    const points = this.state.points.map(pt => pt.add(new Point(e.evt.movementX, e.evt.movementY)))
    this.setState({ points }, () => {
      e.target.x(0)
      e.target.y(0)
    })
  }

  onPolygonTransform = (e: KonvaEventObject<Event>) => {
    const matrix = e.target.getAbsoluteTransform()
    const points = this.state.points.map(pt => Point.fromObj(matrix.point(pt)))
    this.setState({ points }, () => {
      e.target.scaleX(1)
      e.target.scaleY(1)
      e.target.x(0)
      e.target.y(0)
    })
  }

  onPolygonClick = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    this.setState((state, _) => {
      return {
        isPolygonSelected: !state.isPolygonSelected,
      }
    })
  }

  onStageMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    if (e.target === e.target.getStage()) {
      this.setState({ isPolygonSelected: false})
    }
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
    const { points, state } = this.state
    const vertexGroup = this.renderVertices()

    return (
      <div className="PolygonEditor">
        <Stage width={window.innerWidth} height={window.innerHeight} _useStrictMode onMouseDown={(e) => this.onStageMouseDown(e)}>
          <Layer>
            <Polygon
              points={points}
              onDragMove={e => this.onPolygonDrag(e)}
              onDragEnd={e => this.onPolygonDrag(e)}
              onTransform={e => this.onPolygonTransform(e)}
              onClick={e => this.onPolygonClick(e)}
              ref={this.polygonRef}
              isSelected
            />
            <Boundary points={points} closed={true} />
            {vertexGroup}
            {this.state.isPolygonSelected && (
              <Transformer ref={this.transformerRef} padding={10} rotateEnabled={false} />
            )}
          </Layer>
        </Stage>
      </div>
    )
  }
}
