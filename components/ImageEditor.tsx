'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface ImageEditorProps {
  /** 图片 URL */
  src: string;
  /** 编辑后的图片回调 */
  onImageChange?: (dataUrl: string) => void;
  /** 是否启用编辑 */
  enabled?: boolean;
  /** 画笔大小 */
  brushSize?: number;
  /** 工具模式：'erase' | 'draw' */
  mode?: 'erase' | 'draw';
}

/**
 * 图片编辑组件
 * 支持手动擦除和绘制功能
 */
export default function ImageEditor({
  src,
  onImageChange,
  enabled = true,
  brushSize = 20,
  mode = 'erase',
}: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastSrcRef = useRef<string>('');
  const isInitializingRef = useRef(false);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [hasChanges, setHasChanges] = useState(false);

  // 初始化画布
  useEffect(() => {
    if (!canvasRef.current) return;
    if (!src) {
      console.warn('ImageEditor: src is empty');
      return;
    }

    // 如果正在绘制或正在初始化，不要重新初始化
    if (isDrawing || isInitializingRef.current) return;

    // 如果 src 没有变化，不需要重新初始化
    if (src === lastSrcRef.current) return;

    // 如果 src 是 data URL 且与历史记录中的最新状态相同，不重新初始化
    if (src.startsWith('data:image/') && historyRef.current.length > 0 && historyIndexRef.current >= 0) {
      const lastHistory = historyRef.current[historyIndexRef.current];
      if (lastHistory && src === lastHistory) {
        // 如果 src 与当前历史记录相同，不需要重新初始化
        lastSrcRef.current = src;
        return;
      }
    }

    isInitializingRef.current = true;
    lastSrcRef.current = src;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      isInitializingRef.current = false;
      return;
    }

    const img = new Image();
    
    // 只有对于跨域图片才设置 crossOrigin
    // blob: 和 data: URL 不需要 crossOrigin
    if (src.startsWith('http://') || src.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }
    
    img.onload = () => {
      try {
        // 设置画布尺寸
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        // 清除画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 绘制图片
        ctx.drawImage(img, 0, 0);
        
        // 保存初始状态到历史记录
        const initialDataUrl = canvas.toDataURL('image/png');
        const initialHistory = [initialDataUrl];
        // 同步更新 state 和 ref
        historyRef.current = initialHistory;
        historyIndexRef.current = 0;
        setHistory(initialHistory);
        setHistoryIndex(0);
        setHasChanges(false); // 重置更改状态
        
        console.log('ImageEditor: 画布初始化完成', {
          historyLength: initialHistory.length,
          historyIndex: 0,
        });
      } catch (error) {
        console.error('ImageEditor: 绘制图片失败', error);
      } finally {
        isInitializingRef.current = false;
      }
    };
    
    img.onerror = (error) => {
      console.error('ImageEditor: 图片加载失败', {
        src,
        error,
        srcType: src.substring(0, 20),
      });
      isInitializingRef.current = false;
    };
    
    img.src = src;
  }, [src, isDrawing]);

  // 获取画布坐标
  const getCanvasCoordinates = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX: number, clientY: number;
    
    if ('touches' in e) {
      // 触摸事件
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      // 鼠标事件
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  // 绘制/擦除
  const draw = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // 设置绘制样式（每次绘制都需要设置，确保正确）
    if (mode === 'erase') {
      // 擦除模式：使用 destination-out 来擦除像素
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 1.0;
    } else {
      // 绘制模式
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.8;
    }

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // 继续当前路径，画线到新位置
    ctx.lineTo(x, y);
    // 绘制路径
    ctx.stroke();
    // 为下一次绘制准备：移动到当前位置，开始新路径
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, [mode, brushSize]);

  // 开始绘制
  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!enabled) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const coords = getCanvasCoordinates(e);
    if (!coords) return;

    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // 设置绘制样式
    if (mode === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 1.0;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.8;
    }
    
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  }, [enabled, getCanvasCoordinates, mode, brushSize]);

  // 绘制中
  const drawMove = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !enabled) return;

    const coords = getCanvasCoordinates(e);
    if (!coords) return;

    draw(coords.x, coords.y);
  }, [isDrawing, enabled, getCanvasCoordinates, draw]);

  // 结束绘制
  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) {
      setIsDrawing(false);
      return;
    }

    // 保存当前画布状态到历史记录（在停止绘制之前保存）
    const dataUrl = canvas.toDataURL('image/png');
    
    // 停止绘制状态（先停止，避免重复触发）
    setIsDrawing(false);
    
    // 使用函数式更新确保获取最新的历史记录和索引
    setHistory((currentHistory) => {
      setHistoryIndex((currentIndex) => {
        // 确保历史记录有效
        let validHistory = currentHistory.length > 0 ? currentHistory : historyRef.current;
        let validIndex = currentIndex >= 0 ? currentIndex : historyIndexRef.current;
        
        // 如果仍然无效，使用当前画布状态作为初始历史记录
        if (validHistory.length === 0 || validIndex < 0) {
          validHistory = [dataUrl];
          validIndex = 0;
        } else {
          // 创建新的历史记录
          const newHistory = validHistory.slice(0, validIndex + 1);
          newHistory.push(dataUrl);
          validHistory = newHistory;
          validIndex = newHistory.length - 1;
        }
        
        // 更新 ref（立即更新，用于后续操作）
        historyRef.current = validHistory;
        historyIndexRef.current = validIndex;
        
        // 更新更改状态
        setHasChanges(validIndex > 0);
        
        // 通知父组件（延迟执行，避免触发重新渲染导致画布重置）
        setTimeout(() => {
          if (onImageChange && canvasRef.current) {
            onImageChange(dataUrl);
          }
        }, 0);
        
        return validIndex;
      });
      
      return currentHistory;
    });
  }, [isDrawing, onImageChange]);

  // 撤销
  const undo = useCallback(() => {
    // 如果正在绘制，不允许撤销
    if (isDrawing) return;
    
    // 使用 ref 检查，确保获取最新的历史记录
    const currentHistory = historyRef.current.length > 0 ? historyRef.current : history;
    const currentIndex = historyIndexRef.current >= 0 ? historyIndexRef.current : historyIndex;
    
    if (currentIndex <= 0) {
      console.log('ImageEditor: 无法撤销，已在初始状态', { currentIndex, historyLength: currentHistory.length });
      return;
    }
    
    const newIndex = currentIndex - 1;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      // 更新 ref（同步更新）
      historyIndexRef.current = newIndex;
      
      // 更新 state（用于 UI 显示）
      setHistoryIndex(newIndex);
      setHasChanges(newIndex > 0);
      
      console.log('ImageEditor: 撤销完成', { newIndex, historyLength: currentHistory.length });
      
      // 通知父组件
      if (onImageChange) {
        onImageChange(currentHistory[newIndex]);
      }
    };
    img.onerror = () => {
      console.error('撤销时图片加载失败');
    };
    img.src = currentHistory[newIndex];
  }, [onImageChange, isDrawing, historyIndex, history]);

  // 重做
  const redo = useCallback(() => {
    // 如果正在绘制，不允许重做
    if (isDrawing) return;
    
    // 使用 ref 检查，确保获取最新的历史记录
    const currentHistory = historyRef.current.length > 0 ? historyRef.current : history;
    const currentIndex = historyIndexRef.current >= 0 ? historyIndexRef.current : historyIndex;
    
    if (currentIndex >= currentHistory.length - 1) {
      console.log('ImageEditor: 无法重做，已在最新状态', { currentIndex, historyLength: currentHistory.length });
      return;
    }
    
    const newIndex = currentIndex + 1;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      // 更新 ref（同步更新）
      historyIndexRef.current = newIndex;
      
      // 更新 state（用于 UI 显示）
      setHistoryIndex(newIndex);
      setHasChanges(true);
      
      console.log('ImageEditor: 重做完成', { newIndex, historyLength: currentHistory.length });
      
      // 通知父组件
      if (onImageChange) {
        onImageChange(currentHistory[newIndex]);
      }
    };
    img.onerror = () => {
      console.error('重做时图片加载失败');
    };
    img.src = currentHistory[newIndex];
  }, [onImageChange, isDrawing, historyIndex, history]);

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!enabled) return;
      
      // Ctrl+Z 或 Cmd+Z: 撤销
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        setHistoryIndex((currentIndex) => {
          if (currentIndex <= 0) return currentIndex;
          
          const newIndex = currentIndex - 1;
          
          setHistory((currentHistory) => {
            const canvas = canvasRef.current;
            if (!canvas) return currentHistory;

            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return currentHistory;

            const img = new Image();
            img.onload = () => {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);
              
              if (onImageChange) {
                onImageChange(currentHistory[newIndex]);
              }
            };
            img.src = currentHistory[newIndex];
            
            return currentHistory;
          });
          
          setHasChanges(newIndex > 0);
          return newIndex;
        });
      }
      // Ctrl+Shift+Z 或 Ctrl+Y: 重做
      if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') || 
          ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
        e.preventDefault();
        setHistory((currentHistory) => {
          setHistoryIndex((currentIndex) => {
            if (currentIndex >= currentHistory.length - 1) return currentIndex;
            
            const newIndex = currentIndex + 1;
            
            const canvas = canvasRef.current;
            if (!canvas) return currentIndex;

            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return currentIndex;

            const img = new Image();
            img.onload = () => {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);
              
              if (onImageChange) {
                onImageChange(currentHistory[newIndex]);
              }
            };
            img.src = currentHistory[newIndex];
            
            setHasChanges(true);
            return newIndex;
          });
          
          return currentHistory;
        });
      }
    };

    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [enabled, onImageChange]);

  // 棋盘格背景样式（用于显示透明区域）
  const checkerboardStyle: React.CSSProperties = {
    backgroundImage: `
      linear-gradient(45deg, #808080 25%, transparent 25%),
      linear-gradient(-45deg, #808080 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #808080 75%),
      linear-gradient(-45deg, transparent 75%, #808080 75%)
    `,
    backgroundSize: '20px 20px',
    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
    backgroundRepeat: 'repeat',
    display: 'inline-block',
    padding: '8px',
    borderRadius: '8px',
  };

  return (
    <div className="relative">
      <div style={checkerboardStyle}>
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={drawMove}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={drawMove}
          onTouchEnd={stopDrawing}
          className="max-w-full h-auto border border-white/20 rounded-lg"
          style={{
            cursor: enabled ? (mode === 'erase' ? 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23ffffff\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z\'/%3E%3C/svg%3E") 12 12, auto' : 'crosshair') : 'default',
            display: 'block',
          }}
        />
      </div>
      
      {/* 工具栏 */}
      {enabled && (
        <div className="absolute top-4 left-4 flex gap-2 bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg p-2 rounded-lg z-10">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              undo();
            }}
            disabled={isDrawing || historyIndex <= 0 || history.length === 0}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
            title="撤销 (Ctrl+Z)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            撤销
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              redo();
            }}
            disabled={isDrawing || historyIndex >= history.length - 1 || history.length === 0}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
            title="重做 (Ctrl+Y)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
            重做
          </button>
        </div>
      )}
    </div>
  );
}
