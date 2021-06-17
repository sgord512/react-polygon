import { Point } from "./Point";

const MINIMUM_ANGLE_CHANGE = Math.PI / 2;
const MINIMUM_DISTANCE = 2;
const MAXIMUM_DISTANCE = 80;

export function recordPoint(curr: Point, previousPoints: Point[]) : [boolean, Point[]] {
    // This can be made much more sophisticated. Do we want to take into account the time since the last point recorded and drop points at a constant rate, under the assumption that the user is drawing the path with roughly constant arc length per unit time, or do we want to maybe adapt to the rate that the user is drawing. We can also maintain a parallel collection of points corresponding to location where we didn't drop vertices at the cost of some memory increase. 

    // Using bezier curves might be nicer initially at the cost of making editing considerably more difficult. Also, the performance seems to degrade with 100 points or so. I don't have a clear sense of how many points we can expect users to input. 

    // Takes in a new location, decides whether to lay a vertex at that point, and records it if so.

    if (previousPoints.length === 0) { 
        return [false, [curr]]
    } else { 
        const last = previousPoints[previousPoints.length - 1];
        const distance = Point.distance(curr, last);
        if (distance > MAXIMUM_DISTANCE) { 
            return [true, _recordPoint(curr, previousPoints)]
        }
        if (previousPoints.length > 1 && distance > MINIMUM_DISTANCE) { 
            const secondToLast = previousPoints[previousPoints.length - 2];
            const prevVec = last.subtract(secondToLast);
            const currVec = curr.subtract(last);
            const absAngle = Math.abs(Point.angle(currVec, prevVec)); 
            if (absAngle > MINIMUM_ANGLE_CHANGE) { 
                return [true, _recordPoint(curr, previousPoints)];
            }
        }
        
    }
    return [false, previousPoints];        
}

function _recordPoint(curr: Point, previousPoints : Point[]) {
    const finalPoints = previousPoints.slice()
    if (finalPoints.length >= 2) { 
        finalPoints.shift();
    }         
    finalPoints.push(curr);
    return finalPoints
}
