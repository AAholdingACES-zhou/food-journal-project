/**
 * 轮廓手绘边框工具
 * 使用 mask 和 composite 操作生成静态点线边框
 */

export interface ContourBorderOptions {
  /** 边框颜色，默认白色 */
  color?: string;
  /** 边框放大比例，默认 1.06 (约5-8px) - 已废弃，使用 gapPx 和 strokePx */
  borderScale?: number;
  /** 轮廓与主体的间隙（像素），默认 10 */
  gapPx?: number;
  /** 轮廓线条宽度（像素），默认 6 */
  strokePx?: number;
  /** 线段长度范围 [min, max] */
  lineLengthRange?: [number, number];
  /** 点的大小范围 [min, max] */
  dotSizeRange?: [number, number];
  /** 点线间距 */
  spacing?: number;
  /** 抖动幅度 */
  jitterAmount?: number;
}

const DEFAULT_OPTIONS: Required<ContourBorderOptions> = {
  color: '#ffffff',
  borderScale: 1.06, // 保留用于向后兼容
  gapPx: 10,
  strokePx: 5,
  lineLengthRange: [20, 40],
  dotSizeRange: [3, 5],
  spacing: 12,
  jitterAmount: 1.5,
};

/**
 * 生成随机数
 */
function random(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * 创建外轮廓图层（白色边框）
 * 高性能方案：只用 canvas composite 操作，不逐像素处理
 * 实现方式：内扩层 + 外扩层，生成带间隙的轮廓环
 * 使用扩展后的工作画布，确保轮廓不被裁断
 */
async function createBorderMask(
  imageUrl: string,
  options: ContourBorderOptions
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const opts = { ...DEFAULT_OPTIONS, ...options };
        const imageWidth = img.naturalWidth;
        const imageHeight = img.naturalHeight;
        const gapPx = opts.gapPx;
        const strokePx = opts.strokePx;
        
        // 计算扩展后的画布尺寸（原图的2倍，确保有足够空间）
        const canvasWidth = imageWidth * 2;
        const canvasHeight = imageHeight * 2;
        
        // 原始抠图在扩展画布中的绘制位置（居中）
        const imageX = (canvasWidth - imageWidth) / 2;
        const imageY = (canvasHeight - imageHeight) / 2;
        
        // DEBUG: 检查图片是否为透明 PNG
        console.log('图片尺寸:', imageWidth, 'x', imageHeight);
        console.log('扩展画布尺寸:', canvasWidth, 'x', canvasHeight, '(原图的2倍)');
        console.log('图片在画布中的位置:', imageX, ',', imageY);
        console.log('间隙:', gapPx, 'px, 线条宽度:', strokePx, 'px');
        
        // 步骤1：创建扩展后的 offscreen canvas，作为 alpha mask
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = canvasWidth;
        maskCanvas.height = canvasHeight;
        const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: false });
        
        if (!maskCtx) {
          throw new Error('无法创建 mask Canvas 上下文');
        }
        
        // 清除 canvas，避免残影
        maskCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        // 在扩展画布中居中绘制原 PNG（位置为 paddingPx, paddingPx）
        maskCtx.drawImage(img, imageX, imageY, imageWidth, imageHeight);
        
        // DEBUG: 检查 mask 的 alpha 通道
        const maskSample = maskCtx.getImageData(imageX, imageY, Math.min(10, imageWidth), Math.min(10, imageHeight));
        const hasTransparency = Array.from(maskSample.data).some((val, idx) => idx % 4 === 3 && val < 255);
        console.log('Mask 是否有透明区域:', hasTransparency);
        
        // 步骤2：创建内扩层 inner（原图放大，产生 gapPx 间隙）
        const innerCanvas = document.createElement('canvas');
        innerCanvas.width = canvasWidth;
        innerCanvas.height = canvasHeight;
        const innerCtx = innerCanvas.getContext('2d', { willReadFrequently: false });
        
        if (!innerCtx) {
          throw new Error('无法创建 inner Canvas 上下文');
        }
        
        // 清除 canvas
        innerCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        // 计算内扩层的尺寸和偏移（使得边缘距离原图边缘有 gapPx）
        const innerWidth = imageWidth + 2 * gapPx;
        const innerHeight = imageHeight + 2 * gapPx;
        // 内扩层在扩展画布中的位置（相对于原图位置，向左上偏移 gapPx）
        const innerX = imageX - gapPx;
        const innerY = imageY - gapPx;
        
        // 绘制放大后的 mask（内扩层）
        // 从 maskCanvas 的 (imageX, imageY) 位置裁剪 imageWidth x imageHeight
        // 然后放大到 innerWidth x innerHeight，绘制到 innerCanvas 的 (innerX, innerY) 位置
        innerCtx.drawImage(
          maskCanvas,
          imageX, imageY, imageWidth, imageHeight,  // 源区域
          innerX, innerY, innerWidth, innerHeight   // 目标区域（放大）
        );
        
        // 步骤3：创建外扩层 outer（在 inner 基础上再放大 strokePx）
        const outerCanvas = document.createElement('canvas');
        outerCanvas.width = canvasWidth;
        outerCanvas.height = canvasHeight;
        const outerCtx = outerCanvas.getContext('2d', { willReadFrequently: false });
        
        if (!outerCtx) {
          throw new Error('无法创建 outer Canvas 上下文');
        }
        
        // 清除 canvas
        outerCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        // 计算外扩层的尺寸和偏移（在 inner 基础上再扩大 strokePx）
        const outerWidth = innerWidth + 2 * strokePx;
        const outerHeight = innerHeight + 2 * strokePx;
        // 外扩层在扩展画布中的位置（相对于内扩层位置，向左上偏移 strokePx）
        const outerX = innerX - strokePx;
        const outerY = innerY - strokePx;
        
        // 绘制外扩层（基于内扩层）
        // 从 innerCanvas 的 (innerX, innerY) 位置裁剪 innerWidth x innerHeight
        // 然后放大到 outerWidth x outerHeight，绘制到 outerCanvas 的 (outerX, outerY) 位置
        outerCtx.drawImage(
          innerCanvas,
          innerX, innerY, innerWidth, innerHeight,  // 源区域
          outerX, outerY, outerWidth, outerHeight   // 目标区域（放大）
        );
        
        // 步骤4：生成 ring = outer - inner（使用 destination-out）
        outerCtx.globalCompositeOperation = 'destination-out';
        outerCtx.drawImage(innerCanvas, 0, 0);
        
        // 步骤5：使用 source-in + fillRect 把轮廓环填充为白色
        outerCtx.globalCompositeOperation = 'source-in';
        outerCtx.fillStyle = opts.color;
        outerCtx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // DEBUG: 检查轮廓是否生成成功
        const borderSample = outerCtx.getImageData(0, 0, Math.min(50, canvasWidth), Math.min(50, canvasHeight));
        const hasBorder = Array.from(borderSample.data).some((val, idx) => {
          if (idx % 4 === 3) return val > 0; // 检查 alpha
          return false;
        });
        console.log('轮廓环是否生成成功:', hasBorder);
        
        resolve(outerCanvas);
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

/**
 * 步骤2：对轮廓图层进行间隔擦除，实现点-线段-点-线段的手绘效果
 * 高性能方案：使用随机点线噪声遮罩，只在轮廓环区域生成点和线
 */
function applyHandDrawnEffect(
  borderCanvas: HTMLCanvasElement,
  options: ContourBorderOptions
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const ctx = borderCanvas.getContext('2d', { willReadFrequently: false });
  
  if (!ctx) {
    throw new Error('无法获取 Canvas 上下文');
  }
  
  const w = borderCanvas.width;
  const h = borderCanvas.height;
  
  // 1) 创建 stencil canvas：白色=保留，透明=擦除
  const stencil = document.createElement('canvas');
  stencil.width = w;
  stencil.height = h;
  const sctx = stencil.getContext('2d', { willReadFrequently: false });
  
  if (!sctx) {
    throw new Error('无法创建 stencil Canvas 上下文');
  }
  
  // 背景默认透明（相当于全擦除）
  sctx.clearRect(0, 0, w, h);
  
  // 2) 先获取 borderCanvas 的非透明区域（轮廓环区域）
  // 使用采样方式快速检测轮廓环的大致位置
  const borderImageData = ctx.getImageData(0, 0, w, h);
  const borderData = borderImageData.data;
  
  // 采样检测轮廓环区域（提高性能）
  const sampleRate = Math.max(4, Math.floor(Math.min(w, h) / 200));
  const contourRegions: Array<{ x: number; y: number }> = [];
  
  for (let y = 0; y < h; y += sampleRate) {
    for (let x = 0; x < w; x += sampleRate) {
      const index = (y * w + x) * 4;
      const alpha = borderData[index + 3];
      
      // 如果 alpha > 0，说明是轮廓环区域
      if (alpha > 0) {
        contourRegions.push({ x, y });
      }
    }
  }
  
  if (contourRegions.length === 0) {
    console.warn('未检测到轮廓环区域');
    return;
  }
  
  // 3) 只在轮廓环区域随机生成点和线
  sctx.fillStyle = '#ffffff';
  sctx.strokeStyle = '#ffffff';
  sctx.lineCap = 'round';
  sctx.lineJoin = 'round';
  
  // 计算密度：基于轮廓区域数量
  const density = Math.max(500, Math.floor(contourRegions.length * 0.3));
  const dotRatio = 0.4; // 点占比，其余是短线
  
  // 在轮廓区域随机生成点和线
  for (let i = 0; i < density; i++) {
    // 随机选择一个轮廓区域点作为基准
    const basePoint = contourRegions[Math.floor(Math.random() * contourRegions.length)];
    
    // 在基准点周围随机偏移（不超过采样间距）
    const offsetX = (Math.random() - 0.5) * sampleRate * 2;
    const offsetY = (Math.random() - 0.5) * sampleRate * 2;
    const x = basePoint.x + offsetX;
    const y = basePoint.y + offsetY;
    
    // 确保在画布范围内
    if (x < 0 || x >= w || y < 0 || y >= h) continue;
    
    // 随机抖动
    const jx = (Math.random() - 0.5) * opts.jitterAmount * 2;
    const jy = (Math.random() - 0.5) * opts.jitterAmount * 2;
    
    if (Math.random() < dotRatio) {
      // 点
      const r = random(opts.dotSizeRange[0], opts.dotSizeRange[1]) / 2;
      sctx.beginPath();
      sctx.arc(x + jx, y + jy, r, 0, Math.PI * 2);
      sctx.fill();
    } else {
      // 短线（随机方向）
      const len = random(opts.lineLengthRange[0], opts.lineLengthRange[1]);
      const angle = Math.random() * Math.PI * 2;
      const dx = Math.cos(angle) * len * 0.5;
      const dy = Math.sin(angle) * len * 0.5;
      
      sctx.lineWidth = random(opts.strokePx * 0.6, opts.strokePx * 1.2);
      sctx.beginPath();
      sctx.moveTo(x - dx + jx, y - dy + jy);
      sctx.lineTo(x + dx + jx, y + dy + jy);
      sctx.stroke();
    }
  }
  
  // 4) 使用 destination-in 将 stencil 应用到 borderCanvas
  // destination-in: 只保留 stencil 和 borderCanvas 重叠的白色区域
  ctx.save();
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(stencil, 0, 0);
  ctx.restore();
}

/**
 * 将图片和轮廓边框合成
 * 新方案：使用 mask 和 composite 操作生成静态边框
 */
export async function applyContourBorder(
  imageUrl: string,
  options: ContourBorderOptions = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = async () => {
      try {
        const opts = { ...DEFAULT_OPTIONS, ...options };
        const imageWidth = img.naturalWidth;
        const imageHeight = img.naturalHeight;
        
        // 计算扩展后的画布尺寸（原图的2倍，与 createBorderMask 保持一致）
        const canvasWidth = imageWidth * 2;
        const canvasHeight = imageHeight * 2;
        const imageX = (canvasWidth - imageWidth) / 2;
        const imageY = (canvasHeight - imageHeight) / 2;
        
        // 步骤1：创建外轮廓图层（白色边框）
        console.log('创建外轮廓图层...');
        const borderCanvas = await createBorderMask(imageUrl, options);
        
        // 步骤2：对轮廓图层进行间隔擦除，实现点-线段效果
        console.log('应用手绘效果...');
        applyHandDrawnEffect(borderCanvas, options);
        
        // 步骤3：创建最终canvas，合成原图和边框（使用扩展后的尺寸）
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = canvasWidth;
        finalCanvas.height = canvasHeight;
        const finalCtx = finalCanvas.getContext('2d');
        
        if (!finalCtx) {
          reject(new Error('无法创建最终 Canvas 上下文'));
          return;
        }
        
        // 清除 canvas，避免残影
        finalCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        // 在扩展画布中居中绘制原图（位置为 paddingPx, paddingPx）
        finalCtx.drawImage(img, imageX, imageY, imageWidth, imageHeight);
        
        // 再绘制边框图层（使用 source-over，白色边框会叠加在原图上）
        finalCtx.drawImage(borderCanvas, 0, 0);
        
        // 转换为 data URL
        const dataUrl = finalCanvas.toDataURL('image/png');
        console.log('边框生成完成');
        resolve(dataUrl);
      } catch (error) {
        console.error('边框生成失败:', error);
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('图片加载失败'));
    };
    
    img.src = imageUrl;
  });
}
