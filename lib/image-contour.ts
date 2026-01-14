/**
 * 图片轮廓检测工具
 * 用于提取抠图后图片的主体轮廓
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * 从图片中提取轮廓点
 * 通过检测 alpha 通道找到非透明区域的边缘
 */
export async function extractContour(imageUrl: string, threshold: number = 128): Promise<Point[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    // 设置图片加载超时
    const loadTimeout = setTimeout(() => {
      reject(new Error('图片加载超时'));
    }, 10000);
    
    img.onload = () => {
      clearTimeout(loadTimeout);
      
      try {
        console.log('开始轮廓检测，图片尺寸:', img.naturalWidth, 'x', img.naturalHeight);
        
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('无法创建 Canvas 上下文'));
          return;
        }

        // 绘制图片到 Canvas
        ctx.drawImage(img, 0, 0);
        
        // 获取像素数据
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // 检测边缘点
        const contourPoints: Point[] = [];
        const visited = new Set<string>();
        
        // 大幅提高采样率以优化性能
        // 根据图片大小动态调整采样率，目标：处理不超过 200x200 的像素网格
        const maxDimension = Math.max(canvas.width, canvas.height);
        const targetGridSize = 200;
        const sampleRate = Math.max(3, Math.floor(maxDimension / targetGridSize));
        
        // 使用更高效的边缘检测：只扫描边界区域
        for (let y = 0; y < canvas.height; y += sampleRate) {
          for (let x = 0; x < canvas.width; x += sampleRate) {
            const index = (y * canvas.width + x) * 4;
            const alpha = data[index + 3];
            
            // 如果当前像素不透明，快速检查是否为边缘
            if (alpha > threshold) {
              // 快速检查：只检查右和下两个方向（减少计算）
              const rightX = x + sampleRate;
              const bottomY = y + sampleRate;
              let isEdge = false;
              
              // 检查右边界
              if (rightX >= canvas.width) {
                isEdge = true;
              } else {
                const rightIndex = (y * canvas.width + rightX) * 4;
                if (data[rightIndex + 3] <= threshold) {
                  isEdge = true;
                }
              }
              
              // 检查下边界
              if (!isEdge) {
                if (bottomY >= canvas.height) {
                  isEdge = true;
                } else {
                  const bottomIndex = (bottomY * canvas.width + x) * 4;
                  if (data[bottomIndex + 3] <= threshold) {
                    isEdge = true;
                  }
                }
              }
              
              if (isEdge) {
                const key = `${x},${y}`;
                if (!visited.has(key)) {
                  contourPoints.push({ x, y });
                  visited.add(key);
                }
              }
            }
          }
        }
        
        console.log('轮廓检测完成，找到', contourPoints.length, '个边缘点');
        
        // 如果点太多，先进行粗略简化
        let workingPoints = contourPoints;
        if (contourPoints.length > 500) {
          const step = Math.ceil(contourPoints.length / 500);
          workingPoints = contourPoints.filter((_, i) => i % step === 0);
          console.log('轮廓点已简化到', workingPoints.length, '个');
        }
        
        // 简化轮廓点（使用更大的容差以减少点数）
        const simplified = simplifyContour(workingPoints, 8);
        console.log('轮廓简化完成，最终点数:', simplified.length);
        
        resolve(simplified);
      } catch (error) {
        console.error('轮廓检测过程出错:', error);
        reject(error);
      }
    };
    
    img.onerror = () => {
      clearTimeout(loadTimeout);
      console.error('图片加载失败，URL:', imageUrl.substring(0, 100));
      reject(new Error('图片加载失败，请检查图片URL是否有效'));
    };
    
    img.src = imageUrl;
  });
}

/**
 * Douglas-Peucker 算法简化轮廓
 */
function simplifyContour(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) return points;
  
  // 找到距离起点和终点连线最远的点
  let maxDistance = 0;
  let maxIndex = 0;
  
  const start = points[0];
  const end = points[points.length - 1];
  
  for (let i = 1; i < points.length - 1; i++) {
    const distance = pointToLineDistance(points[i], start, end);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }
  
  // 如果最大距离大于容差，递归简化
  if (maxDistance > tolerance) {
    const left = simplifyContour(points.slice(0, maxIndex + 1), tolerance);
    const right = simplifyContour(points.slice(maxIndex), tolerance);
    
    // 合并结果（去除重复点）
    return [...left.slice(0, -1), ...right];
  } else {
    // 如果距离小于容差，只保留起点和终点
    return [start, end];
  }
}

/**
 * 计算点到直线的距离
 */
function pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;
  
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  
  if (lenSq !== 0) {
    param = dot / lenSq;
  }
  
  let xx: number, yy: number;
  
  if (param < 0) {
    xx = lineStart.x;
    yy = lineStart.y;
  } else if (param > 1) {
    xx = lineEnd.x;
    yy = lineEnd.y;
  } else {
    xx = lineStart.x + param * C;
    yy = lineStart.y + param * D;
  }
  
  const dx = point.x - xx;
  const dy = point.y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 对轮廓点进行排序，使其形成连续的路径
 * 优化版本：使用更高效的算法，限制最大点数
 */
export function sortContourPoints(points: Point[]): Point[] {
  if (points.length <= 2) return points;
  
  // 如果点太多，先进行采样
  const maxPoints = 300; // 大幅减少最大点数
  let workingPoints = points;
  if (points.length > maxPoints) {
    const step = Math.ceil(points.length / maxPoints);
    workingPoints = points.filter((_, i) => i % step === 0);
  }
  
  // 使用更高效的最近邻算法
  const sorted: Point[] = [workingPoints[0]];
  const remaining = new Map<number, Point>();
  workingPoints.slice(1).forEach((p, i) => remaining.set(i, p));
  
  let iterations = 0;
  const maxIterations = workingPoints.length * 2; // 防止死循环
  
  while (remaining.size > 0 && iterations < maxIterations) {
    iterations++;
    const lastPoint = sorted[sorted.length - 1];
    let minDistance = Infinity;
    let closestIndex: number | null = null;
    
    // 找到距离当前点最近的点（限制搜索范围以提高性能）
    const searchLimit = Math.min(remaining.size, 50); // 每次只搜索最近的50个点
    let searched = 0;
    
    for (const [index, point] of remaining.entries()) {
      if (searched >= searchLimit) break;
      searched++;
      
      const dist = Math.sqrt(
        Math.pow(point.x - lastPoint.x, 2) + 
        Math.pow(point.y - lastPoint.y, 2)
      );
      
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = index;
      }
    }
    
    if (closestIndex !== null) {
      sorted.push(remaining.get(closestIndex)!);
      remaining.delete(closestIndex);
    } else {
      // 如果没有找到，添加第一个剩余点
      const firstEntry = remaining.entries().next().value;
      if (firstEntry) {
        sorted.push(firstEntry[1]);
        remaining.delete(firstEntry[0]);
      } else {
        break;
      }
    }
  }
  
  // 如果还有剩余点，直接添加到末尾
  if (remaining.size > 0) {
    sorted.push(...Array.from(remaining.values()));
  }
  
  return sorted;
}
