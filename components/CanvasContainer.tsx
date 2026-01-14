'use client';

import { ReactNode, useRef, useEffect } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT, CANVAS_PADDING } from '@/lib/constants';

interface CanvasContainerProps {
  children: ReactNode;
  backgroundColor: string;
  showBoundary?: boolean;
  className?: string;
}

/**
 * 画布容器组件
 * 提供固定尺寸的画布，带有清晰的边界指示
 */
export default function CanvasContainer({
  children,
  backgroundColor,
  showBoundary = true,
  className = '',
}: CanvasContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        ref={containerRef}
        className="relative"
        style={{
          width: `${CANVAS_WIDTH}px`,
          height: `${CANVAS_HEIGHT}px`,
          backgroundColor,
          padding: `${CANVAS_PADDING}px`,
          boxSizing: 'border-box',
          // 边界指示
          ...(showBoundary && {
            border: '2px dashed rgba(255, 255, 255, 0.3)',
            boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.1) inset',
          }),
        }}
      >
        {/* 边界角标记 */}
        {showBoundary && (
          <>
            {/* 左上角 */}
            <div
              className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white/50"
              style={{ transform: 'translate(-2px, -2px)' }}
            />
            {/* 右上角 */}
            <div
              className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white/50"
              style={{ transform: 'translate(2px, -2px)' }}
            />
            {/* 左下角 */}
            <div
              className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white/50"
              style={{ transform: 'translate(-2px, 2px)' }}
            />
            {/* 右下角 */}
            <div
              className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white/50"
              style={{ transform: 'translate(2px, 2px)' }}
            />
          </>
        )}
        
        {/* 内容区域 */}
        <div className="relative w-full h-full">
          {children}
        </div>
      </div>
    </div>
  );
}

// 导出画布尺寸常量，供其他组件使用
export { CANVAS_WIDTH, CANVAS_HEIGHT, CANVAS_PADDING };
