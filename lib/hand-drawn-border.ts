/**
 * 手绘风格边框工具函数
 * 使用 Canvas API 绘制不规则的手绘线条边框
 */

export interface HandDrawnBorderOptions {
  /** 边框颜色，默认白色 */
  color?: string;
  /** 边框宽度（像素），默认 3 */
  lineWidth?: number;
  /** 是否使用虚线样式，默认 true */
  dashed?: boolean;
  /** 虚线间隔数组，默认 [5, 3] */
  dashPattern?: number[];
  /** 线条粗细变化范围，默认 [1, 4] */
  lineWidthVariation?: [number, number];
  /** 透明度变化范围，默认 [0.7, 1.0] */
  opacityVariation?: [number, number];
  /** 抖动幅度（像素），默认 2 */
  jitterAmount?: number;
  /** 边框内边距（像素），默认 10 */
  padding?: number;
}

const DEFAULT_OPTIONS: Required<HandDrawnBorderOptions> = {
  color: '#ffffff',
  lineWidth: 3,
  dashed: true,
  dashPattern: [5, 3],
  lineWidthVariation: [1, 4],
  opacityVariation: [0.7, 1.0],
  jitterAmount: 2,
  padding: 10,
};

/**
 * 生成随机数
 */
function random(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * 添加抖动效果到点
 */
function addJitter(point: { x: number; y: number }, amount: number): { x: number; y: number } {
  return {
    x: point.x + random(-amount, amount),
    y: point.y + random(-amount, amount),
  };
}

/**
 * 生成手绘风格的路径点
 * 使用贝塞尔曲线控制点创建不规则线条
 */
function generateHandDrawnPath(
  start: { x: number; y: number },
  end: { x: number; y: number },
  jitterAmount: number,
  numPoints: number = 5
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [start];
  
  for (let i = 1; i < numPoints; i++) {
    const t = i / numPoints;
    const point = {
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
    };
    points.push(addJitter(point, jitterAmount));
  }
  
  points.push(end);
  return points;
}

/**
 * 在 Canvas 上绘制手绘风格的边框
 */
export function drawHandDrawnBorder(
  canvas: HTMLCanvasElement,
  imageWidth: number,
  imageHeight: number,
  options: HandDrawnBorderOptions = {}
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('无法获取 Canvas 上下文');
  }

  // 注意：此函数假设 canvas 尺寸已经设置好，且图片已经绘制
  // 只负责绘制边框，不清除画布内容
  const padding = opts.padding;

  // 计算边框路径（图片周围）
  const topLeft = { x: padding, y: padding };
  const topRight = { x: imageWidth + padding, y: padding };
  const bottomRight = { x: imageWidth + padding, y: imageHeight + padding };
  const bottomLeft = { x: padding, y: imageHeight + padding };

  // 设置虚线样式
  if (opts.dashed) {
    ctx.setLineDash(opts.dashPattern);
  } else {
    ctx.setLineDash([]);
  }

  // 绘制四条边
  const sides = [
    { start: topLeft, end: topRight },      // 上边
    { start: topRight, end: bottomRight },  // 右边
    { start: bottomRight, end: bottomLeft }, // 下边
    { start: bottomLeft, end: topLeft },    // 左边
  ];

  sides.forEach((side, sideIndex) => {
    // 生成手绘路径点
    const pathPoints = generateHandDrawnPath(
      side.start,
      side.end,
      opts.jitterAmount,
      8 // 每条边的点数
    );

    // 设置随机线条宽度和透明度（每条边都不同）
    const lineWidth = random(opts.lineWidthVariation[0], opts.lineWidthVariation[1]);
    const opacity = random(opts.opacityVariation[0], opts.opacityVariation[1]);
    
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = opts.color;
    ctx.globalAlpha = opacity;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 绘制路径
    ctx.beginPath();
    ctx.moveTo(pathPoints[0].x, pathPoints[0].y);

    // 使用平滑曲线连接点
    for (let i = 1; i < pathPoints.length - 1; i++) {
      const currentPoint = pathPoints[i];
      const nextPoint = pathPoints[i + 1];
      
      // 计算控制点（当前点和下一个点的中点）
      const controlX = (currentPoint.x + nextPoint.x) / 2;
      const controlY = (currentPoint.y + nextPoint.y) / 2;
      
      ctx.quadraticCurveTo(currentPoint.x, currentPoint.y, controlX, controlY);
    }
    
    // 连接到最后一个点
    const lastPoint = pathPoints[pathPoints.length - 1];
    ctx.lineTo(lastPoint.x, lastPoint.y);
    
    ctx.stroke();
    
    // 重置透明度
    ctx.globalAlpha = 1.0;
  });
}

/**
 * 将图片和手绘边框合成一张新图片
 */
export async function applyHandDrawnBorder(
  imageUrl: string,
  options: HandDrawnBorderOptions = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const opts = { ...DEFAULT_OPTIONS, ...options };
        const padding = opts.padding;
        
        // 创建画布
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('无法创建 Canvas 上下文'));
          return;
        }

        // 设置画布尺寸（图片 + 边框）
        canvas.width = img.width + padding * 2;
        canvas.height = img.height + padding * 2;

        // 绘制图片（居中，留出边框空间）
        ctx.drawImage(img, padding, padding, img.width, img.height);

        // 绘制手绘边框
        drawHandDrawnBorder(canvas, img.width, img.height, options);

        // 转换为 data URL
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('图片加载失败'));
    };
    
    img.src = imageUrl;
  });
}
