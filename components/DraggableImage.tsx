'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ImageFile } from '@/types';

interface DraggableImageProps {
  image: ImageFile;
  onUpdate: (id: string, updates: Partial<ImageFile>) => void;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  isSelected: boolean;
  canvasBounds?: {
    width: number;
    height: number;
  };
}

/**
 * 可拖拽、缩放、旋转的图片组件
 */
export default function DraggableImage({
  image,
  onUpdate,
  onSelect,
  onEdit,
  isSelected,
  canvasBounds,
}: DraggableImageProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const currentPositionRef = useRef({ x: image.x ?? 0, y: image.y ?? 0 });
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // 获取图片的位置和变换属性（带默认值）
  const x = image.x ?? 0;
  const y = image.y ?? 0;
  const scale = image.scale ?? 1;
  const rotation = image.rotation ?? 0;

  // 更新当前位置ref
  useEffect(() => {
    currentPositionRef.current = { x, y };
  }, [x, y]);

  // 开始拖拽
  const handleMouseDown = (e: React.MouseEvent) => {
    // 如果点击的是控制按钮，不触发拖拽
    if ((e.target as HTMLElement).closest('.control-button')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    if (!imageRef.current) return;

    // 获取容器（画布内容区域）
    const container = imageRef.current.parentElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    // 计算鼠标相对于容器的位置，减去图片当前的位置，得到偏移量
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;
    
    dragOffsetRef.current = {
      x: mouseX - x,
      y: mouseY - y,
    };
    setIsDragging(true);
    onSelect(image.id);
  };

  // 拖拽中 - 使用useCallback优化性能，使用ref避免依赖项问题
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizing) {
      // 缩放处理
      const resizeStart = resizeStartRef.current;
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const baseDistance = Math.sqrt(
        resizeStart.width * resizeStart.width + resizeStart.height * resizeStart.height
      );
      const currentScaledWidth = (image.width || 400) * scale;
      const newScale = Math.max(0.3, Math.min(3, (distance / baseDistance) * (currentScaledWidth / (image.width || 400))));
      
      onUpdate(image.id, { scale: newScale });
      return;
    }

    if (!isDragging || !imageRef.current) return;

    const container = imageRef.current.parentElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;
    
    // 使用ref获取最新的偏移量
    const offset = dragOffsetRef.current;
    
    // 计算新位置
    let newX = mouseX - offset.x;
    let newY = mouseY - offset.y;

    // 限制在容器内
    const scaledWidth = (image.width || 400) * scale;
    const scaledHeight = (image.height || 300) * scale;
    
    // 使用canvasBounds如果提供，否则使用容器尺寸
    const maxWidth = canvasBounds?.width ?? containerRect.width;
    const maxHeight = canvasBounds?.height ?? containerRect.height;
    
    // 确保图片不会超出边界
    const minX = 0;
    const minY = 0;
    const maxX = Math.max(0, maxWidth - scaledWidth);
    const maxY = Math.max(0, maxHeight - scaledHeight);

    // 限制在边界内
    newX = Math.max(minX, Math.min(newX, maxX));
    newY = Math.max(minY, Math.min(newY, maxY));

    // 使用ref获取当前位置，避免依赖项问题
    const currentPos = currentPositionRef.current;
    
    // 节流：限制更新频率（每16ms更新一次，约60fps）
    const now = Date.now();
    if (now - lastUpdateTimeRef.current < 16) {
      // 如果距离上次更新太近，跳过
      if (Math.abs(newX - currentPos.x) < 1 && Math.abs(newY - currentPos.y) < 1) {
        return;
      }
    }

    // 只有当位置真正改变时才更新
    if (Math.abs(newX - currentPos.x) > 0.5 || Math.abs(newY - currentPos.y) > 0.5) {
      lastUpdateTimeRef.current = now;
      currentPositionRef.current = { x: newX, y: newY };
      onUpdate(image.id, { x: newX, y: newY });
    }
  }, [isDragging, isResizing, image, scale, canvasBounds, onUpdate]);

  // 结束拖拽/缩放 - 使用useCallback优化
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  // 添加全局鼠标事件监听 - 优化依赖项，避免频繁重新绑定
  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // 开始缩放
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: rect.width,
      height: rect.height,
    };
    setIsResizing(true);
    onSelect(image.id);
  };

  // 旋转功能
  const handleRotate = (direction: 'left' | 'right') => {
    const step = 15; // 每次旋转15度
    const newRotation = direction === 'left' 
      ? rotation - step 
      : rotation + step;
    onUpdate(image.id, { rotation: newRotation });
  };

  // 缩放功能（按钮控制）
  const handleScale = (delta: number) => {
    const newScale = Math.max(0.3, Math.min(3, scale + delta));
    onUpdate(image.id, { scale: newScale });
  };

  const imageUrl = image.borderedUrl || image.editedUrl || image.processedUrl || image.url;
  const scaledWidth = (image.width || 400) * scale;
  const scaledHeight = (image.height || 300) * scale;

  return (
    <div
      ref={imageRef}
      className={`absolute cursor-move select-none ${isSelected ? 'ring-2 ring-blue-500' : ''} ${
        isDragging ? 'opacity-80' : ''
      }`}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center center',
        zIndex: isSelected ? 10 : 1,
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="relative group">
        <img
          src={imageUrl}
          alt="美食"
          className="max-w-none rounded-lg"
          style={{
            width: `${scaledWidth}px`,
            height: `${scaledHeight}px`,
            objectFit: 'contain',
            display: 'block',
          }}
          draggable={false}
        />

        {/* 选中时的控制按钮 */}
        {isSelected && (
          <div className="absolute -top-12 left-0 flex gap-2 bg-black/80 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
            {/* 编辑按钮 */}
            <button
              onClick={() => onEdit(image.id)}
              className="control-button px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-black text-xs"
              title="编辑图片"
            >
              编辑
            </button>

            {/* 旋转按钮 */}
            <button
              onClick={() => handleRotate('left')}
              className="control-button px-2 py-1 bg-gray-600 hover:bg-gray-700 rounded text-black text-xs"
              title="逆时针旋转"
            >
              ↺
            </button>
            <button
              onClick={() => handleRotate('right')}
              className="control-button px-2 py-1 bg-gray-600 hover:bg-gray-700 rounded text-black text-xs"
              title="顺时针旋转"
            >
              ↻
            </button>

            {/* 缩放按钮 */}
            <button
              onClick={() => handleScale(-0.1)}
              className="control-button px-2 py-1 bg-gray-600 hover:bg-gray-700 rounded text-black text-xs"
              title="缩小"
            >
              −
            </button>
            <button
              onClick={() => handleScale(0.1)}
              className="control-button px-2 py-1 bg-gray-600 hover:bg-gray-700 rounded text-black text-xs"
              title="放大"
            >
              +
            </button>
          </div>
        )}

        {/* 缩放控制点（右下角） */}
        {isSelected && (
          <div
            className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-nwse-resize rounded-full border-2 border-white"
            onMouseDown={handleResizeStart}
            style={{
              transform: `translate(50%, 50%) rotate(${-rotation}deg)`,
            }}
            title="拖拽缩放"
          />
        )}
      </div>
    </div>
  );
}
