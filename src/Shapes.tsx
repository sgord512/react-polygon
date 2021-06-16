import { Point } from './Point'
import { Circle, Line, Group, Transformer } from 'react-konva'
import { useState } from 'react'
import { KonvaEventObject } from 'konva/lib/Node'
import React from 'react'

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
  provisional?: boolean
}

export function Vertex(props: VertexProps) {
  const { point, onDragMove, provisional } = props
  const [mouseOver, setMouseOver] = useState(false)

  //console.log(`pt: ${point.x}, ${point.y}`)

  return (
    <Circle
      radius={VERTEX_RADIUS}
      fill={mouseOver ? VERTEX_MOUSEOVER_COLOR : VERTEX_DEFAULT_COLOR}
      stroke="blue"
      x={point.x}
      y={point.y}
      onMouseOver={() => setMouseOver(true)}
      onMouseOut={() => setMouseOver(false)}
      onDragMove={onDragMove}
      draggable={!provisional}
      listening={!provisional}
    />
  )
}
// POLYGON
export interface PolygonProps {
  points: Point[]
  onDragMove?: KonvaEventHandler<DragEvent>
  onDragEnd?: KonvaEventHandler<DragEvent>
  fill?: string
  draggable?: boolean
  isSelected?: boolean
  onTransform?: KonvaEventHandler<Event>
  onClick?: KonvaEventHandler<MouseEvent>
  ref: React.MutableRefObject<undefined>
}

export const Polygon = React.forwardRef((props: PolygonProps, ref) => {
  const flatPoints = Point.flattenPoints(props.points)
  const {
    fill = POLYGON_FILL_COLOR,
    draggable = true,
    onDragMove,
    onDragEnd,
    onTransform,
    onClick,
    isSelected = false,
  } = props

  return (
    <Line
      points={flatPoints}
      fill={fill}
      draggable={draggable}
      closed
      ref={ref}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onTransform={onTransform}
      onClick={onClick}
    />
  )
})

// BOUNDARY/SEGMENTS

// BOUNDARY SEGMENT
export interface SegmentProps {
  startEndPoints: [number, number, number, number]
  onHover?: KonvaEventHandler<MouseEvent>
  onEndHover?: KonvaEventHandler<MouseEvent>
}

export function Segment(props: SegmentProps) {
  const { startEndPoints, onHover, onEndHover } = props
  return (
    <Line
      points={startEndPoints}
      stroke={BOUNDARY_STROKE_COLOR}
      strokeWidth={BOUNDARY_STROKE_WIDTH}
      hitStrokeWidth={BOUNDARY_STROKE_HIT_WIDTH}
      onMouseMove={onHover}
      onMouseOver={onHover}
      onMouseOut={onEndHover}
    />
  )
}

// BOUNDARY
export interface BoundaryProps {
  points: Point[]
  closed: boolean
  onHover: (ix: number, e: KonvaEventObject<MouseEvent>) => void
  onEndHover?: KonvaEventHandler<MouseEvent>
}

export function Boundary(props: BoundaryProps) {
  const { points, closed, onHover, onEndHover } = props
  const segments = points.slice(0, points.length - 1).map((_, ix) => {
    const startEndPoints: [number, number, number, number] = [
      points[ix].x,
      points[ix].y,
      points[ix + 1].x,
      points[ix + 1].y,
    ]
    return <Segment startEndPoints={startEndPoints} key={ix.toString()} onHover={e => onHover(ix, e)} onEndHover={onEndHover} />
  })
  if (closed) {
    const startEndPoints: [number, number, number, number] = [
      points[points.length - 1].x,
      points[points.length - 1].y,
      points[0].x,
      points[0].y,
    ]
    const ix = points.length - 1
    segments.push(<Segment startEndPoints={startEndPoints} key={ix.toString()} onHover={e => onHover(ix, e)} onEndHover={onEndHover} />)
  }
  return <Group>{segments}</Group>
}
