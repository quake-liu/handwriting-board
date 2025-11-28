import { Point, StrokeStyle } from '../types';

// Simple distance function
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

// Distance from point p to line segment defined by v and w
export const distanceToSegment = (p: Point, v: Point, w: Point) => {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
  if (l2 === 0) return distance(p, v);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return distance(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
};

// Interpolate points for smoother lines (Catmull-Rom or Quadratic)
export const getSplinePoints = (points: Point[]): Point[] => {
  if (points.length < 3) return points;
  const newPoints: Point[] = [];
  
  // Always add first point
  newPoints.push(points[0]);

  for (let i = 1; i < points.length - 2; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    
    // Add intermediate points
    const steps = Math.floor(distance(p0, p1) / 2) + 1;
    for (let t = 1; t < steps; t++) {
      const ratio = t / steps;
      newPoints.push({
        x: p0.x + (p1.x - p0.x) * ratio,
        y: p0.y + (p1.y - p0.y) * ratio,
        pressure: (p0.pressure || 0.5) + ((p1.pressure || 0.5) - (p0.pressure || 0.5)) * ratio
      });
    }
    newPoints.push(p1);
  }
  
  // Add last points
  newPoints.push(points[points.length - 1]);
  return newPoints;
};

// Render a stroke element to canvas context
export const renderStroke = (
  ctx: CanvasRenderingContext2D,
  points: Point[],
  style: StrokeStyle
) => {
  if (points.length < 2) return;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  if (style.isHighlighter) {
    ctx.globalAlpha = 0.4;
    ctx.globalCompositeOperation = 'multiply';
  } else {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // Basic variable width implementation based on pressure
  // For a true "ink" feel, we draw segments.
  
  if (points[0].pressure !== undefined) {
    // Pressure sensitive rendering
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i+1];
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.quadraticCurveTo(mid.x, mid.y, p2.x, p2.y);
      
      const pressure = p1.pressure || 0.5;
      ctx.lineWidth = Math.max(1, style.size * pressure);
      ctx.strokeStyle = style.color;
      ctx.stroke();
    }
  } else {
    // Simple rendering for no-pressure devices or massive point clouds
    ctx.beginPath();
    ctx.lineWidth = style.size;
    ctx.strokeStyle = style.color;
    ctx.moveTo(points[0].x, points[0].y);
    
    // Smooth curves using quadratic bezier
    for (let i = 1; i < points.length - 2; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    // Curve through the last two points
    if(points.length > 2) {
        ctx.quadraticCurveTo(
            points[points.length-2].x, 
            points[points.length-2].y, 
            points[points.length-1].x, 
            points[points.length-1].y
        );
    }
    ctx.stroke();
  }
  
  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = 'source-over';
};

export const renderShape = (
  ctx: CanvasRenderingContext2D,
  type: 'rectangle' | 'circle' | 'line',
  x: number, y: number, w: number, h: number,
  style: StrokeStyle
) => {
  ctx.beginPath();
  ctx.lineWidth = style.size;
  ctx.strokeStyle = style.color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (type === 'rectangle') {
    ctx.strokeRect(x, y, w, h);
  } else if (type === 'circle') {
    ctx.ellipse(x + w/2, y + h/2, Math.abs(w/2), Math.abs(h/2), 0, 0, 2 * Math.PI);
    ctx.stroke();
  } else if (type === 'line') {
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y + h);
    ctx.stroke();
  }
};