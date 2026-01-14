'use client';

import { useEffect, useState, useRef } from 'react';
import { drawHandDrawnBorder, HandDrawnBorderOptions } from '@/lib/hand-drawn-border';

interface HandDrawnImageProps {
  /** 图片 URL */
  src: string;
  /** 图片 alt 文本 */
  alt?: string;
  /** CSS 类名 */
  className?: string;
  /** 边框配置选项 */
  borderOptions?: HandDrawnBorderOptions;
  /** 是否显示边框，默认 true */
  showBorder?: boolean;
}

/**
 * 带手绘边框的图片组件
 * 使用 Canvas 在图片周围绘制手绘风格的边框
 */
export default function HandDrawnImage({
  src,
  alt = '',
  className = '',
  borderOptions,
  showBorder = true,
}: HandDrawnImageProps) {
  const [canvasUrl, setCanvasUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!showBorder) {
      setIsLoading(false);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      if (!canvasRef.current) return;

      try {
        setIsLoading(true);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          setIsLoading(false);
          return;
        }

        const opts = { ...borderOptions };
        const padding = opts.padding || 10;
        
        // 设置画布尺寸（图片 + 边框空间）
        canvas.width = img.naturalWidth + padding * 2;
        canvas.height = img.naturalHeight + padding * 2;

        // 绘制图片（居中，留出边框空间）
        ctx.drawImage(img, padding, padding, img.naturalWidth, img.naturalHeight);

        // 绘制手绘边框
        drawHandDrawnBorder(canvas, img.naturalWidth, img.naturalHeight, opts);

        // 转换为 data URL
        const dataUrl = canvas.toDataURL('image/png');
        setCanvasUrl(dataUrl);
        setIsLoading(false);
      } catch (error) {
        console.error('绘制边框失败:', error);
        setIsLoading(false);
      }
    };
    
    img.onerror = () => {
      console.error('图片加载失败');
      setIsLoading(false);
    };
    
    img.src = src;
  }, [src, showBorder, borderOptions]);

  // 如果不显示边框，直接返回普通图片
  if (!showBorder) {
    return <img src={src} alt={alt} className={className} />;
  }

  return (
    <div className="relative inline-block">
      {/* 隐藏的 Canvas 用于绘制 */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* 显示合成后的图片 */}
      {canvasUrl ? (
        <img
          src={canvasUrl}
          alt={alt}
          className={className}
        />
      ) : (
        // 加载中显示原图
        <div className="relative">
          <img
            src={src}
            alt={alt}
            className={className}
            style={{ opacity: isLoading ? 0.5 : 1 }}
          />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white/60 text-xs">绘制边框中...</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
