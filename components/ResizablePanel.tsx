'use client';

import { useState, useRef, useEffect } from 'react';

interface ResizablePanelProps {
  children: React.ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  side?: 'left' | 'right';
}

/**
 * 可调整大小的面板组件
 */
export default function ResizablePanel({
  children,
  defaultWidth = 320,
  minWidth = 200,
  maxWidth = 600,
  side = 'left',
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!panelRef.current) return;

      const container = panelRef.current.parentElement;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      let newWidth: number;

      if (side === 'left') {
        newWidth = e.clientX - containerRect.left;
      } else {
        newWidth = containerRect.right - e.clientX;
      }

      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, minWidth, maxWidth, side]);

  return (
    <div
      ref={panelRef}
      className="relative flex-shrink-0"
      style={{ width: `${width}px` }}
    >
      {children}
      {/* 调整大小的拖拽条 */}
      <div
        className={`absolute top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors ${
          side === 'left' ? 'right-0' : 'left-0'
        } ${isResizing ? 'bg-blue-500' : 'bg-transparent'}`}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}
