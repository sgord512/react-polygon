import React from 'react'
import './App.css'
//import Konva from 'konva';
import { Group, Layer, Stage, Transformer } from 'react-konva'
import { Point } from './Point'
import { Vertex, Polygon, Boundary } from './Shapes'
import { KonvaEventObject } from 'konva/lib/Node'

export interface EditorState {
  state:
    | 'incomplete'
    | 'incomplete_placing_vertex'
    | 'incomplete_vertex_selected'
    | 'complete_vertex_hover'
    | 'complete_vertex_selected_hover'
    | 'complete_vertex_mousedown'
    | 'complete_vertex_selected_mousedown'
    | 'complete'
    | 'complete_vertex_selected'
    | 'complete_vertex_dragging'
    | 'complete_poly_selected'
    | 'complete_poly_transforming'
    | 'complete_placing_boundary_vertex'
  points: Point[]
  isPolygonSelected: boolean
  selectedVertex?: number
  provisionalBoundaryPoint?: Point
  provisionalPoint?: Point
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

  onVertexDragEnd = (ix: number, e: KonvaEventObject<DragEvent>) => {
    const points = this.state.points.slice()
    points[ix] = new Point(e.target.x(), e.target.y())
    this.setState({ state: 'complete', points: points, isPolygonSelected: false })
  }

  onVertexDrag = (ix: number, e: KonvaEventObject<DragEvent>) => {
    const points = this.state.points.slice()
    points[ix] = new Point(e.target.x(), e.target.y())
    this.setState({ state: 'complete_vertex_dragging', points: points, isPolygonSelected: false })
  }

  onVertexClick = (ix: number, e: KonvaEventObject<MouseEvent>) => {
    this.setState((state, _) => {
      const deselect = state.selectedVertex === ix
      return {
        state: deselect ? 'complete' : 'complete_vertex_selected',
        selectedVertex: deselect ? undefined : ix,
      }
    })
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
    e.cancelBubble = true
    this.setState((state, _) => {
      return {
        state: state.isPolygonSelected ? 'complete' : 'complete_poly_selected',
        isPolygonSelected: !state.isPolygonSelected,
      }
    })
  }

  onStageMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true
    if (e.target === e.target.getStage()) {
      this.setState({
        isPolygonSelected: false,
        state: 'complete',
      })
    }
  }

  onBoundaryHover = (ix: number, e: KonvaEventObject<MouseEvent>) => {
    //console.log('On boundary hover')
    const { state } = this.state
    switch (state) {
      case 'incomplete':
      case 'incomplete_placing_vertex':
      case 'complete_vertex_dragging':
      case 'complete_poly_transforming':
      case 'complete_vertex_mousedown':
      case 'complete_vertex_selected_mousedown':
      case 'incomplete_vertex_selected':
      case 'complete_poly_selected':
        return
      case 'complete':
      case 'complete_vertex_selected':
      case 'complete_placing_boundary_vertex':
        this.setState((state, _) => {
          const pointer = e.target.getStage().getPointerPosition()
          return {
            state: 'complete_placing_boundary_vertex',
            provisionalBoundaryPoint: Point.fromObj(pointer),
            isPolygonSelected: false,
          }
        })
        return
    }
  }

  onBoundaryHoverEnd = (e: KonvaEventObject<MouseEvent>) => {
    this.setState({ state: 'complete', provisionalBoundaryPoint: undefined })
  }

  onBoundaryMouseDown = (ix: number, e: KonvaEventObject<MouseEvent>) => {
    this.setState((state, _) => {
      const points = state.points.slice()
      points.splice(ix + 1, 0, state.provisionalBoundaryPoint)
      return {
        points: points,
        state: 'complete',
      }
    })
  }

  renderVertices = () => {
    const { state, points, selectedVertex, provisionalBoundaryPoint } = this.state
    var vertices
    switch (state) {
      case 'complete':
      case 'complete_placing_boundary_vertex':
      case 'complete_poly_selected':
      case 'complete_poly_transforming':
      case 'complete_vertex_selected':
      case 'complete_vertex_dragging':
        vertices = points.map((pt, ix) => {
          return (
            <Vertex
              point={pt}
              key={ix.toString()}
              onDragMove={e => this.onVertexDrag(ix, e)}
              isSelected={selectedVertex === ix}
              onClick={e => this.onVertexClick(ix, e)}
              onDragEnd={e => this.onVertexDragEnd(ix, e)}
            />
          )
        })
        if (state === 'complete_placing_boundary_vertex' && provisionalBoundaryPoint) {
          vertices.push(<Vertex point={provisionalBoundaryPoint} provisional key={(-1).toString()} />)
        }
        return <Group>{vertices}</Group>
      case 'complete_vertex_selected_hover':
      case 'complete_vertex_hover':
      case 'complete_vertex_mousedown':
      case 'incomplete':
      case 'incomplete_placing_vertex':
      case 'incomplete_vertex_selected':
        return null
    }
  }

  render = () => {
    const { points } = this.state

    return (
      <div className="PolygonEditor">
        <Stage
          width={window.innerWidth}
          height={window.innerHeight}
          _useStrictMode
          onMouseDown={e => this.onStageMouseDown(e)}
        >
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
            <Boundary
              points={points}
              closed={true}
              onHover={this.onBoundaryHover}
              onEndHover={this.onBoundaryHoverEnd}
              onMouseDown={this.onBoundaryMouseDown}
            />

            {this.renderVertices()}

            {this.state.isPolygonSelected && (
              <Transformer ref={this.transformerRef} padding={10} rotateEnabled={false} />
            )}
          </Layer>
        </Stage>
      </div>
    )
  }
}
