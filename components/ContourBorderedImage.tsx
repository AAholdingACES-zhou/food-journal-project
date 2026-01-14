'use client';

import { useEffect, useState, useRef } from 'react';
import { applyContourBorder, ContourBorderOptions } from '@/lib/contour-border';

interface ContourBorderedImageProps {
  /** 图片 URL */
  src: string;
  /** 图片 alt 文本 */
  alt?: string;
  /** CSS 类名 */
  className?: string;
  /** 边框配置选项 */
  borderOptions?: ContourBorderOptions;
  /** 是否显示边框，默认 true */
  showBorder?: boolean;
  /** 边框加载完成回调 */
  onBorderComplete?: (borderedImageUrl: string) => void;
  /** 进度回调 */
  onProgress?: (progress: number, message: string) => void;
}

/**
 * 带轮廓手绘边框的图片组件
 * 自动检测图片主体轮廓并绘制点线结合的边框
 */
export default function ContourBorderedImage({
  src,
  alt = '',
  className = '',
  borderOptions,
  showBorder = true,
  onBorderComplete,
  onProgress,
}: ContourBorderedImageProps) {
  const [borderedImageUrl, setBorderedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState('正在准备...');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 使用 useRef 来跟踪是否已经处理过，避免重复调用
  const processedRef = useRef<string | null>(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (!showBorder) {
      setIsLoading(false);
      return;
    }

    // 如果正在处理或已经处理过相同的 src，则跳过
    const currentSrc = src;
    if (isProcessingRef.current || processedRef.current === currentSrc) {
      return;
    }

    // 清除之前的超时
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    isProcessingRef.current = true;
    setIsLoading(true);
    setError(null);
    setProgressMessage('正在检测轮廓...');
    if (onProgress) onProgress(20, '正在检测轮廓...');

    // 设置超时保护（30秒）
    const timeoutId = setTimeout(() => {
      console.error('边框生成超时');
      setError('处理超时，请重试或使用较小的图片');
      setIsLoading(false);
      setProgressMessage('超时');
      isProcessingRef.current = false;
      if (onProgress) onProgress(0, '超时');
    }, 30000);

    timeoutRef.current = timeoutId;

    // 使用 setTimeout 让 UI 有机会更新
    setTimeout(() => {
      console.log('开始添加边框，图片URL:', currentSrc.substring(0, 50) + '...');
      
      applyContourBorder(currentSrc, borderOptions)
        .then((borderedUrl) => {
          // 清除超时
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }

          console.log('边框生成成功');
          setProgressMessage('正在生成边框...');
          if (onProgress) onProgress(80, '正在生成边框...');
          
          // 再次延迟以显示进度
          setTimeout(() => {
            setBorderedImageUrl(borderedUrl);
            setIsLoading(false);
            setProgressMessage('完成');
            isProcessingRef.current = false;
            processedRef.current = currentSrc; // 标记为已处理
            if (onProgress) onProgress(100, '完成');
            if (onBorderComplete) {
              onBorderComplete(borderedUrl);
            }
          }, 100);
        })
        .catch((err) => {
          // 清除超时
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }

          console.error('添加边框失败:', err);
          const errorMessage = err instanceof Error ? err.message : '添加边框失败';
          setError(errorMessage);
          setIsLoading(false);
          setProgressMessage('失败');
          isProcessingRef.current = false;
          if (onProgress) onProgress(0, '失败');
        });
    }, 50);

    // 清理函数
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [src, showBorder]); // 移除 borderOptions, onBorderComplete, onProgress 依赖，避免重复调用

  if (!showBorder) {
    return <img src={src} alt={alt} className={className} />;
  }

  if (error) {
    return (
      <div className="relative">
        <img src={src} alt={alt} className={className} />
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-lg p-4">
          <p className="text-red-400 text-sm mb-2 text-center">边框生成失败</p>
          <p className="text-white/60 text-xs mb-4 text-center break-words">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setIsLoading(true);
              setProgressMessage('正在准备...');
              // 触发重新加载
              const event = new Event('retry');
              window.dispatchEvent(event);
            }}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded text-sm transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

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
  };

  return (
    <div className="relative">
      {borderedImageUrl ? (
        <div>
          <div className="mb-2 text-center">
            <p className="text-green-400 text-sm">✓ 边框已成功添加</p>
          </div>
          <div style={checkerboardStyle} className="inline-block rounded-lg">
            <img
              src={borderedImageUrl}
              alt={alt}
              className={className}
              style={{ display: 'block' }}
            />
          </div>
        </div>
      ) : (
        <div className="relative">
          <div style={checkerboardStyle} className="inline-block rounded-lg">
            <img
              src={src}
              alt={alt}
              className={className}
              style={{ 
                opacity: isLoading ? 0.5 : 1,
                display: 'block'
              }}
            />
          </div>
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded-lg">
              <div className="text-white text-sm mb-2">{progressMessage}</div>
              <div className="w-32 h-1 bg-white/20 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-white animate-pulse" style={{ width: '60%' }}></div>
              </div>
              <div className="text-white/60 text-xs">这可能需要几秒钟...</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
