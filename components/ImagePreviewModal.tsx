'use client';

import { useEffect } from 'react';
import { ImageFile } from '@/types';

interface ImagePreviewModalProps {
  image: ImageFile | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImagePreviewModal({ image, isOpen, onClose }: ImagePreviewModalProps) {
  // 按ESC键关闭
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // 防止背景滚动
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !image) return null;

  const hasProcessed = !!image.processedUrl;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-6xl w-full max-h-[90vh] bg-black/95 rounded-lg border border-white/20 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-black/80 hover:bg-black text-black rounded-full p-2 transition-colors"
          aria-label="关闭预览"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 预览内容 */}
        <div className="p-6 overflow-y-auto max-h-[90vh]">
          <h2 className="text-2xl font-bold mb-6 text-center">图片预览</h2>
          
          {hasProcessed ? (
            // 如果有处理后的图片，显示对比
            <div className="grid md:grid-cols-2 gap-6">
              {/* 原图 */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-center">原图</h3>
                <div className="bg-white/10 rounded-lg p-4 flex items-center justify-center min-h-[400px]">
                  <img
                    src={image.url}
                    alt="原图"
                    className="max-w-full max-h-[600px] object-contain rounded-lg"
                  />
                </div>
              </div>

              {/* 抠图后 */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-center">抠图后</h3>
                <div className="bg-white/10 rounded-lg p-4 flex items-center justify-center min-h-[400px]">
                  <img
                    src={image.processedUrl}
                    alt="抠图后的图片"
                    className="max-w-full max-h-[600px] object-contain rounded-lg"
                  />
                </div>
              </div>
            </div>
          ) : (
            // 如果没有处理后的图片，只显示原图
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-center">原图</h3>
              <div className="bg-white/10 rounded-lg p-4 flex items-center justify-center min-h-[400px]">
                <img
                  src={image.url}
                  alt="原图"
                  className="max-w-full max-h-[600px] object-contain rounded-lg"
                />
              </div>
              <p className="text-center text-gray-400 text-sm mt-4">
                此图片尚未进行AI抠图处理
              </p>
            </div>
          )}

          {/* 图片信息 */}
          <div className="mt-6 pt-6 border-t border-white/20 text-sm text-gray-400 space-y-2">
            <div className="flex justify-between">
              <span>图片尺寸：</span>
              <span>{image.width} × {image.height} 像素</span>
            </div>
            {image.processStatus && (
              <div className="flex justify-between">
                <span>处理状态：</span>
                <span className={
                  image.processStatus === 'completed' ? 'text-green-400' :
                  image.processStatus === 'processing' ? 'text-blue-400' :
                  image.processStatus === 'failed' ? 'text-red-400' :
                  'text-gray-400'
                }>
                  {image.processStatus === 'completed' ? '已完成' :
                   image.processStatus === 'processing' ? '处理中' :
                   image.processStatus === 'failed' ? '失败' :
                   '待处理'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

