import { Point } from './Point'
import { Circle, Line, Group } from 'react-konva'
import { useState } from 'react'
import { KonvaEventObject } from 'konva/lib/Node'

const VERTEX_RADIUS = 5
const VERTEX_DEFAULT_COLOR = 'white'
const VERTEX_SELECTED_COLOR = 'rgba(237, 82, 61, 1)'
const VERTEX_MOUSEOVER_COLOR = 'rgba(40, 191, 138, 1)'
const VERTEX_MOUSEDOWN_COLOR = 'rgba(35, 108, 82, 1)'
const POLYGON_FILL_COLOR = 'rgba(201, 201, 201, 1)'
const BOUNDARY_STROKE_COLOR = 'rgba(108, 159, 241, 1)'
const BOUNDARY_STROKE_WIDTH = 3
const BOUNDARY_STROKE_HIT_WIDTH = 8

type KonvaEventHandler<Event> = (e: KonvaEventObject<Event>) => void

// VERTEX
export interface VertexProps {
  point: Point
  isSelected?: boolean
  onDragMove?: KonvaEventHandler<DragEvent>
}

export function Vertex(props: VertexProps) {
  const { point, onDragMove } = props
  const [mouseOver, setMouseOver] = useState(false)

  console.log(`pt: ${point.x}, ${point.y}`)

  return (
    <Circle
      radius={VERTEX_RADIUS}
      fill={mouseOver ? VERTEX_MOUSEOVER_COLOR : VERTEX_DEFAULT_COLOR}
      stroke="blue"
      x={point.x}
      y={point.y}
      onMouseOver={() => setMouseOver(true)}
      onMouseOut={() => setMouseOver(false)}
      draggable
      onDragMove={onDragMove}
    />
  )
}
// POLYGON
export interface PolygonProps {
  points: Point[]
  onChange: KonvaEventHandler<Event>
  x: number
  y: number
}

export function Polygon(props: PolygonProps) {
  const flatPoints = Point.flattenPoints(props.points)
  console.log(flatPoints)
  return (
    <Line
      points={flatPoints}
      fill={POLYGON_FILL_COLOR}
      x={0} y={0}
      draggable
      closed={true}
      onDragMove={props.onChange}
    />
  )
}

// BOUNDARY
export interface SegmentProps {
  startEndPoints: [number, number, number, number]
}

export function Segment(props: SegmentProps) {
  const { startEndPoints } = props
  return (
    <Line
      points={startEndPoints}
      stroke={BOUNDARY_STROKE_COLOR}
      strokeWidth={BOUNDARY_STROKE_WIDTH}
      hitStrokeWidth={BOUNDARY_STROKE_HIT_WIDTH}
    />
  )
}

export interface BoundaryProps {
  points: Point[]
  closed: boolean
}

export function Boundary(props: BoundaryProps) {
  const { points, closed } = props
  const segments = []
  for (var i = 0; i + 1 < points.length; i++) {
    const startEndPoints: [number, number, number, number] = [
      points[i].x,
      points[i].y,
      points[i + 1].x,
      points[i + 1].y,
    ]
    segments.push(<Segment startEndPoints={startEndPoints} key={i.toString()} />)
  }
  if (closed) {
    const startEndPoints: [number, number, number, number] = [
      points[points.length - 1].x,
      points[points.length - 1].y,
      points[0].x,
      points[0].y,
    ]
    segments.push(<Segment startEndPoints={startEndPoints} />)
  }
  return <Group>{segments}</Group>
}
