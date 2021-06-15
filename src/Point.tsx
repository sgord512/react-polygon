export interface PointLike {
    x: number, 
    y: number
}

export class Point {
    x: number;
    y: number;
  
    constructor(x: number,y: number) { 
        this.x = x;
        this.y = y;    
    } 
    
    copy(other: {x: number, y: number}) : Point { 
        this.x = other.x;
        this.y = other.y;
        return this;
    }
  
    static distance(a: Point, b: Point) : number { 
        return (a.subtract(b)).length();
    }
  
    static fromObj(other: PointLike) : Point { 
        return (new Point(0,0)).copy(other);
    }
  
    subtract(other: PointLike) : Point { 
        return new Point(this.x - other.x, this.y - other.y);
    }

    add(other: PointLike) : Point { 
        return new Point(this.x + other.x, this.y + other.y);
    }
  
    length() : number { 
        return Math.sqrt(this.x ** 2 + this.y ** 2);
    }
  
    clone() : Point { 
        return new Point(this.x, this.y);
    }
  
    static dot(a: Point, b: Point) : number { 
        return a.x * b.x + a.y * b.y;
    }
  
    static angle(a: Point, b: Point): number { 
        return Math.acos(Point.dot(a, b) / (a.length() * b.length()));
    }

    static flattenPoints(points: Point[]) { 
        var arr : number[] = [];
        for (const point of points) { 
            arr = arr.concat([point.x, point.y]);
        }
        return arr;
    }
    
    static restorePoints(arr: number[]) {
        var points: Point[] = [];
        for (var i = 0; i < arr.length; i += 2) {
            points.push(new Point(arr[i], arr[i+1]));
        }
        return points;
    }
  }