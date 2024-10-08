import React from 'react'
import './App.css'
//import Konva from 'konva';
import { Group, Layer, Stage, Transformer } from 'react-konva'
import { Point } from './Point'
import { Vertex, Polygon, Boundary } from './Shapes'
import { KonvaEventObject } from 'konva/lib/Node'
import { Transformer as KonvaTransformer } from 'konva/lib/shapes/Transformer'
import { Line as KonvaLine } from 'konva/lib/shapes/Line'
import { Stage as KonvaStage } from 'konva/lib/Stage'
import { Vector2d as KonvaVector2d } from 'konva/lib/types'
import { recordPoint } from './PointController'
const DELTA = 1

type EditData =
  | { tag: 'incomplete'; hover?: number }
  | { tag: 'incomplete_placing_vertex'; point: Point; atEnd: boolean; prevPoints?: Point[] }
  // The 'incomplete_vertex_selected' state is not possible
  | { tag: 'incomplete_vertex_selected'; selected: number; hover?: number }
  | { tag: 'complete'; hover?: number }
  | { tag: 'complete_vertex_selected'; selected: number; hover?: number }
  | { tag: 'complete_vertex_dragging' }
  | { tag: 'complete_poly_selected'; hover?: number }
  | { tag: 'complete_poly_selected_transforming' }
  | { tag: 'complete_poly_selected_dragging' }
  | { tag: 'complete_poly_transforming' }
  | { tag: 'complete_poly_dragging' }
  | { tag: 'complete_placing_boundary_vertex'; point: Point }

function isIncompletePolygon(data: EditData): boolean {
  return (
    data.tag === 'incomplete' || data.tag === 'incomplete_placing_vertex' || data.tag === 'incomplete_vertex_selected'
  )
}

// function cloneData(data: EditData) : EditData {
//   switch (data.tag) {
//     case 'complete':
//       return {tag: 'complete'}
//     case 'complete_placing_boundary_vertex':
//       return {tag: 'complete_placing_boundary_vertex', point: data.point.clone()}
//     case 'complete_poly_dragging':
//       return
//     case 'complete_poly_selected':
//       return
//     case 'complete_poly_selected_dragging'

//   }
// }

// TODO: Make the points props just raw x and y objects, then turn them into the point instances in the constructor.
// TODO: Get rotation working
// TODO: Add an onChange prop for the polygon.

export type EditorState = {
  data: EditData // I don't want to lift the values here into the top-level of the object, because that would lead to shallow merges and more fields than expected. So I'm wrapping this in an additional layer of abstraction.
  points: Point[]
}
export interface PolygonEditorProps {
  points: { x: number; y: number }[]
  complete: boolean
  onChange?: (points: Point[], complete: boolean) => void
}

export default class PolygonEditor extends React.Component<PolygonEditorProps, EditorState> {
  polygonRef: React.RefObject<KonvaLine>
  transformerRef: React.RefObject<KonvaTransformer>
  stageRef: React.RefObject<KonvaStage>
  onChange?: (points: Point[], complete: boolean) => void

  constructor(props: PolygonEditorProps) {
    super(props)
    this.state = {
      data: props.complete
        ? { tag: 'complete' }
        : { tag: 'incomplete_placing_vertex', point: new Point(0, 0), atEnd: true },
      points: props.points.map(pt => Point.fromObj(pt)),
    }
    this.polygonRef = React.createRef<KonvaLine>()
    this.transformerRef = React.createRef<KonvaTransformer>()
    this.stageRef = React.createRef<KonvaStage>()
    this.onChange = props.onChange
  }

  componentDidUpdate = (_prevProps: any, prevState: EditorState, _snapshot: any) => {
    const wasPolygonSelected =
      prevState.data.tag === 'complete_poly_selected' || prevState.data.tag === 'complete_poly_selected_transforming'
    const isPolygonSelected = this.state.data.tag === 'complete_poly_selected'
    const transformer = this.transformerRef.current as KonvaTransformer
    const polygon = this.polygonRef.current as KonvaLine
    if (!wasPolygonSelected && isPolygonSelected) {
      transformer.nodes([polygon])
      transformer.getLayer()?.batchDraw()
    }

    // Decide whether to call the onChange handler
    const oldPoints = prevState.points
    const points = this.state.points
    const isCurrIncomplete = isIncompletePolygon(this.state.data)
    var didPointsChange = false
    if (oldPoints.length !== points.length) {
      didPointsChange = true
    } else {
      for (var i = 0; i < points.length; i++) {
        if (points[i].x !== oldPoints[i].x || points[i].y !== oldPoints[i].y) {
          didPointsChange = true
        }
      }
    }
    if (didPointsChange) {
      this.onChange && this.onChange(points, !isCurrIncomplete)
    } else {
      const isPrevIncomplete = isIncompletePolygon(prevState.data)
      if (isPrevIncomplete !== isCurrIncomplete) {
        this.onChange && this.onChange(points, !isCurrIncomplete)
      }
    }
  }

  onVertexDragEnd = (ix: number, e: KonvaEventObject<DragEvent>) => {
    const points = this.state.points.slice()
    points[ix] = new Point(e.target.x(), e.target.y())
    this.setState({ data: { tag: 'complete', hover: ix }, points: points })
  }

  onVertexDrag = (ix: number, e: KonvaEventObject<DragEvent>) => {
    const points = this.state.points.slice()
    points[ix] = new Point(e.target.x(), e.target.y())
    this.setState({ data: { tag: 'complete_vertex_dragging' }, points: points })
  }

  // onVertexMouseOver = (ix: number, e: KonvaEventObject<MouseEvent>) => {
  //   const data = this.state.data
  //   switch (data.tag) {
  //     case ''
  //     default:
  //       return
  //   }
  // }

  onVertexClick = (ix: number, e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true
    const data = this.state.data
    const points = this.state.points
    const point = Point.fromObj(e.target?.getStage()?.getPointerPosition() as KonvaVector2d)
    switch (data.tag) {
      case 'complete':
      case 'complete_poly_selected':
        this.setState({ data: { tag: 'complete_vertex_selected', selected: ix } })
        break
      case 'complete_vertex_selected':
        this.setState({
          data: data.selected === ix ? { tag: 'complete' } : { tag: 'complete_vertex_selected', selected: ix },
        })
        break
      case 'incomplete':
        if (ix === 0 || ix === points.length - 1) {
          this.setState({
            points: points,
            data: {
              tag: 'incomplete_placing_vertex',
              point: point,
              atEnd: ix === points.length - 1,
            },
          })
          return
        }
        break
      case 'incomplete_placing_vertex':
        if ((data.atEnd && ix === 0) || (!data.atEnd && ix === points.length - 1)) {
          this.setState({
            points: points,
            data: { tag: 'complete' },
          })
        }
        break
      default:
        throw new Error("This shouldn't happen!")
    }
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
      e.target.x(0)
      e.target.y(0)
      //e.target.rotation(0)
      e.target.scaleX(1)
      e.target.scaleY(1)
    })
  }

  onPolygonClick = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true
    const data = this.state.data
    switch (data.tag) {
      case 'complete':
      case 'complete_vertex_selected':
        this.setState({ data: { tag: 'complete_poly_selected' } })
        break
      case 'complete_poly_selected':
        this.setState({ data: { tag: 'complete' } })
        break
      default:
        throw new Error('Bad state in onPolygonClick')
    }
  }

  onStageClick = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true
    const data = this.state.data
    const points = this.state.points.slice()
    const point = Point.fromObj(e.target?.getStage()?.getPointerPosition() as KonvaVector2d)
    switch (data.tag) {
      case 'incomplete_placing_vertex':
        if (data.atEnd) {
          points.push(data.point)
        } else {
          points.unshift(data.point)
        }
        this.setState({ points: points, data: { tag: 'incomplete_placing_vertex', atEnd: data.atEnd, point: point } })
        break
      case 'complete_poly_selected':
        const targetIsStage = e.target === e.target.getStage()
        if (targetIsStage) {
          this.setState({ data: { tag: 'complete' } })
        }
        break
      default:
        return
    }
  }

  onStageMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true
    const point = Point.fromObj(e.target?.getStage()?.getPointerPosition() as KonvaVector2d)
    const data = this.state.data
    const points = this.state.points.slice()
    if (data.tag === 'incomplete_placing_vertex') {
      if (e.evt.shiftKey) {
        //console.log("Shift!")
        const [shouldPlacePoint, prevPoints] = recordPoint(point, data.prevPoints || [])
        if (shouldPlacePoint) {
          if (data.atEnd) {
            points.push(data.point)
          } else {
            points.unshift(data.point)
          }
        }
        this.setState({
          points: points,
          data: { tag: 'incomplete_placing_vertex', point: point, atEnd: data.atEnd, prevPoints: prevPoints },
        })
      } else {
        this.setState({ data: { tag: 'incomplete_placing_vertex', point: point, atEnd: data.atEnd } })
      }
    }
  }

  onBoundaryHover = (_ix: number, e: KonvaEventObject<MouseEvent>) => {
    //console.log('On boundary hover')
    const tag = this.state.data.tag
    switch (tag) {
      case 'complete':
      case 'complete_placing_boundary_vertex':
        const pointer = e.target.getStage()?.getPointerPosition() || { x: 0, y: 0 }
        this.setState({ data: { tag: 'complete_placing_boundary_vertex', point: Point.fromObj(pointer) } })
        break
      case 'complete_vertex_selected':
      case 'complete_poly_selected':
      case 'incomplete':
      case 'incomplete_placing_vertex':
        return
      default:
        throw new Error('Bad state in onBoundaryHover')
    }
  }

  onBoundaryHoverEnd = (_e: KonvaEventObject<MouseEvent>) => {
    const tag = this.state.data.tag
    switch (tag) {
      case 'complete_placing_boundary_vertex':
        this.setState({ data: { tag: 'complete' } })
        break
      default:
        return
    }
  }

  onBoundaryMouseDown = (ix: number, _e: KonvaEventObject<MouseEvent>) => {
    const data = this.state.data
    switch (data.tag) {
      case 'complete_placing_boundary_vertex':
        const points = this.state.points.slice()
        points.splice(ix + 1, 0, data.point)
        this.setState({ data: { tag: 'complete' }, points: points })
        break
      default:
        return
    }
  }

  renderVertices = () => {
    const { data, points } = this.state
    var vertices
    switch (data.tag) {
      case 'complete':
      case 'complete_placing_boundary_vertex':
      case 'complete_poly_selected':
      case 'complete_poly_transforming':
      case 'complete_vertex_dragging':
      case 'complete_vertex_selected':
      case 'incomplete':
      case 'incomplete_placing_vertex':
        const selected = data.tag === 'complete_vertex_selected' ? data.selected : null
        vertices = points.map((pt, ix) => {
          return (
            <Vertex
              point={pt}
              key={ix.toString()}
              onDragMove={e => this.onVertexDrag(ix, e)}
              isSelected={selected === ix}
              onClick={e => this.onVertexClick(ix, e)}
              onDragEnd={e => this.onVertexDragEnd(ix, e)}
            />
          )
        })
        if (data.tag === 'complete_placing_boundary_vertex' || data.tag === 'incomplete_placing_vertex') {
          vertices.push(<Vertex point={data.point} provisional key={(-1).toString()} />)
        }
        return <Group>{vertices}</Group>
      default:
        throw new Error('Bad state on render vertices')
    }
  }

  onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    const data = this.state.data
    const points = this.state.points.slice()
    switch (data.tag) {
      case 'complete_vertex_selected':
        switch (e.code) {
          case 'Backspace': // Backspace
          case 'Delete': // Delete
            points.splice(data.selected, 1)
            this.setState({
              points: points,
              data: { tag: points.length > 2 ? 'complete' : 'incomplete' },
            })
            break
          case 'ArrowLeft': // Left arrow
            points[data.selected] = points[data.selected].clone()
            points[data.selected].x -= DELTA
            this.setState({
              points: points,
              data: { tag: 'complete_vertex_selected', selected: data.selected },
            })
            break
          case 'ArrowUp': // Up arrow
            points[data.selected] = points[data.selected].clone()
            points[data.selected].y -= DELTA
            this.setState({
              points: points,
              data: { tag: 'complete_vertex_selected', selected: data.selected },
            })
            break
          case 'ArrowRight': // Right arrow
            points[data.selected] = points[data.selected].clone()
            points[data.selected].x += DELTA
            this.setState({
              points: points,
              data: { tag: 'complete_vertex_selected', selected: data.selected },
            })
            break
          case 'ArrowDown': // Down arrow
            points[data.selected] = points[data.selected].clone()
            points[data.selected].y += DELTA
            this.setState({
              points: points,
              data: { tag: 'complete_vertex_selected', selected: data.selected },
            })
            break
          default:
            return
        }
        break
      case 'complete_poly_selected':
        const point = Point.fromObj(this.stageRef.current?.getPointerPosition() as KonvaVector2d)
        this.setState({ points: [], data: { tag: 'incomplete_placing_vertex', point: point, atEnd: true } })
        break
      default:
        return
    }
  }

  renderBoundary = () => {
    const data = this.state.data
    const points = this.state.points
    if (data.tag === 'incomplete_placing_vertex') {
      const renderPoints = points.slice()
      if (data.atEnd) {
        renderPoints.push(data.point)
      } else {
        renderPoints.unshift(data.point)
      }
      return (
        <Boundary
          points={renderPoints}
          closed={false}
          onHover={this.onBoundaryHover}
          onEndHover={this.onBoundaryHoverEnd}
          onMouseDown={this.onBoundaryMouseDown}
        />
      )
    } else if (data.tag === 'incomplete') {
      return (
        <Boundary
          points={points}
          closed={false}
          onHover={this.onBoundaryHover}
          onEndHover={this.onBoundaryHoverEnd}
          onMouseDown={this.onBoundaryMouseDown}
        />
      )
    } else {
      return (
        <Boundary
          points={points}
          closed={true}
          onHover={this.onBoundaryHover}
          onEndHover={this.onBoundaryHoverEnd}
          onMouseDown={this.onBoundaryMouseDown}
        />
      )
    }
  }

  render = () => {
    const { points, data } = this.state

    const isPolySelected =
      data.tag === 'complete_poly_selected' ||
      data.tag === 'complete_poly_selected_transforming' ||
      data.tag === 'complete_poly_selected_dragging'

    return (
      <div className="PolygonEditor" tabIndex={-1} onKeyDown={this.onKeyDown}>
        <Stage
          width={window.innerWidth}
          height={window.innerHeight}
          _useStrictMode
          onClick={this.onStageClick}
          onMouseMove={this.onStageMouseMove}
          ref={this.stageRef}
        >
          <Layer>
            {data.tag !== 'incomplete_placing_vertex' && data.tag !== 'incomplete' && (
              <Polygon
                points={points}
                onDragMove={this.onPolygonDrag}
                onDragEnd={this.onPolygonDrag}
                onTransform={this.onPolygonTransform}
                onClick={this.onPolygonClick}
                ref={this.polygonRef}
                isSelected
              />
            )}
            {this.renderBoundary()}
            {this.renderVertices()}

            {isPolySelected && <Transformer ref={this.transformerRef} padding={10} rotateEnabled={false} />}
          </Layer>
        </Stage>
      </div>
    )
  }
}
