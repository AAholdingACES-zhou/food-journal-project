'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import ImageUploader from '@/components/ImageUploader';
import ImagePreviewModal from '@/components/ImagePreviewModal';
import HandDrawnImage from '@/components/HandDrawnImage';
import { ImageFile, ImageProcessStatus } from '@/types';
import { removeBackground } from '@/lib/remove-bg';

export default function UploadPage() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<ImageFile | null>(null);
  const router = useRouter();
  const { data: session } = useSession();

  const handleSignOut = async () => {
    await signOut({ 
      callbackUrl: '/login',
      redirect: true 
    });
  };

  const handleImagesSelected = (newImages: ImageFile[]) => {
    // 新上传的图片初始状态为pending
    const imagesWithStatus = newImages.map(img => ({
      ...img,
      processStatus: 'pending' as ImageProcessStatus,
    }));
    setImages((prev) => [...prev, ...imagesWithStatus]);
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => {
      const newImages = prev.filter((img) => img.id !== id);
      // 释放URL对象
      const removed = prev.find((img) => img.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.url);
      }
      return newImages;
    });
  };

  const handleStartProcessing = async () => {
    if (images.length === 0) {
      alert('请先上传图片');
      return;
    }

    // 获取所有未处理的图片
    const pendingImages = images.filter(img => !img.processedUrl && img.processStatus !== 'processing');
    
    if (pendingImages.length === 0) {
      alert('所有图片已处理完成');
      return;
    }

    setIsProcessing(true);

    // 批量处理图片
    for (const image of pendingImages) {
      // 更新状态为处理中
      setImages((prev) =>
        prev.map((img) =>
          img.id === image.id
            ? { ...img, processStatus: 'processing' as ImageProcessStatus }
            : img
        )
      );

      try {
        // 调用抠图API
        const processedImageUrl = await removeBackground(image.file);
        
        // 更新状态为完成，并保存处理后的URL
        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id
              ? {
                  ...img,
                  processStatus: 'completed' as ImageProcessStatus,
                  processedUrl: processedImageUrl,
                  processError: undefined,
                }
              : img
          )
        );
      } catch (error) {
        // 更新状态为失败
        let errorMessage = '抠图失败';
        let canUseOriginal = false;
        
        if (error instanceof Error) {
          errorMessage = error.message;
          
          // 从错误对象中提取 canUseOriginal 标志
          const errorAny = error as any;
          if (errorAny.canUseOriginal !== undefined) {
            canUseOriginal = errorAny.canUseOriginal;
          }
          
          // 如果错误信息包含"无法识别"，也标记为可以使用原图
          if (errorMessage.includes('无法识别')) {
            canUseOriginal = true;
          }
        }
        
        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id
              ? {
                  ...img,
                  processStatus: 'failed' as ImageProcessStatus,
                  processError: errorMessage,
                  canUseOriginal: canUseOriginal,
                }
              : img
          )
        );
      }
    }

    setIsProcessing(false);
  };

  const handleContinue = () => {
    if (images.length === 0) {
      alert('请至少上传一张图片');
      return;
    }
    
    // 检查是否有未处理的图片
    const hasUnprocessedImages = images.some(img => !img.processedUrl);
    if (hasUnprocessedImages) {
      const confirmContinue = confirm('部分图片尚未处理，是否继续？未处理的图片将使用原图。');
      if (!confirmContinue) {
        return;
      }
    }
    
    // 将图片数据存储到 sessionStorage（避免 URL 过长导致 431 错误）
    // 只存储必要的元数据，不存储 File 对象（因为无法序列化）
    const imagesData = images.map(img => ({
      id: img.id,
      url: img.processedUrl || img.url,
      processedUrl: img.processedUrl,
      width: img.width,
      height: img.height,
      processStatus: img.processStatus,
      processError: img.processError,
      canUseOriginal: img.canUseOriginal,
    }));
    
    try {
      console.log('Storing images to sessionStorage:', imagesData.length, 'images');
      sessionStorage.setItem('uploadedImages', JSON.stringify(imagesData));
      console.log('Images stored, navigating to edit page...');
      // 使用简单的标识符跳转，而不是在 URL 中传递数据
      router.push('/edit?from=upload');
    } catch (error) {
      console.error('存储图片数据失败:', error);
      alert('数据存储失败，请重试');
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-1">上传美食图片</h1>
            <p className="text-text-secondary text-sm">上传您的美食照片，开始制作精美手帐</p>
          </div>
          <div className="flex items-center gap-4">
            {session?.user?.email && (
              <span className="text-sm text-text-secondary hidden sm:inline">{session.user.email}</span>
            )}
            <button
              onClick={handleSignOut}
              className="px-4 py-2 border border-default rounded-md hover:bg-bg-hover transition-all duration-normal text-sm"
            >
              退出登录
            </button>
          </div>
        </div>

        <div className="mb-8">
          <ImageUploader 
            onImagesSelected={handleImagesSelected} 
            maxImages={10}
            currentImageCount={images.length}
          />
        </div>

        {images.length > 0 && (
          <div className="mb-8">
            <div className="bg-bg-card border border-default rounded-lg p-6 shadow-md mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-semibold mb-2">已上传的图片 ({images.length})</h2>
                  {images.length > 0 && (
                    <div className="flex flex-wrap gap-3 text-sm text-text-secondary">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        已完成: {images.filter(img => img.processStatus === 'completed').length}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        处理中: {images.filter(img => img.processStatus === 'processing').length}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                        待处理: {images.filter(img => !img.processedUrl && img.processStatus !== 'processing').length}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        失败: {images.filter(img => img.processStatus === 'failed').length}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleStartProcessing}
                  disabled={isProcessing || images.every(img => img.processedUrl)}
                  className="px-6 py-3 bg-accent-primary text-black rounded-md hover:bg-accent-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-normal font-medium shadow-md hover:shadow-lg whitespace-nowrap"
                >
                  {isProcessing ? '处理中...' : images.every(img => img.processedUrl) ? '全部完成' : '开始AI抠图'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image) => (
                <div 
                  key={image.id} 
                  className="relative group cursor-pointer bg-bg-card border border-default rounded-lg overflow-hidden transition-all duration-normal hover:border-hover hover:shadow-lg"
                  onClick={() => setPreviewImage(image)}
                >
                  {/* 显示原图或处理后的图片（抠图后的图片带手绘边框） */}
                  <div className="aspect-square bg-gray-50 flex items-center justify-center">
                    {image.processedUrl ? (
                      <HandDrawnImage
                        src={image.processedUrl}
                        alt="上传的图片"
                        className="w-full h-full object-contain transition-transform group-hover:scale-105"
                        showBorder={true}
                        borderOptions={{
                          color: '#ffffff',
                          padding: 8,
                          lineWidthVariation: [1.5, 3.5],
                          opacityVariation: [0.8, 1.0],
                          jitterAmount: 2,
                        }}
                      />
                    ) : (
                      <img
                        src={image.url}
                        alt="上传的图片"
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    )}
                  </div>
                  
                  {/* 处理状态指示器 */}
                  {image.processStatus && (
                    <div className="absolute top-2 left-2">
                      {image.processStatus === 'processing' && (
                        <div className="bg-blue-500/90 backdrop-blur-sm text-white px-2 py-1 rounded-md text-xs flex items-center gap-1.5 shadow-md">
                          <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          处理中
                        </div>
                      )}
                      {image.processStatus === 'completed' && (
                        <div className="bg-green-500/90 backdrop-blur-sm text-white px-2 py-1 rounded-md text-xs flex items-center gap-1.5 shadow-md">
                          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          已完成
                        </div>
                      )}
                      {image.processStatus === 'failed' && (
                        <div className="bg-red-500/90 backdrop-blur-sm text-white px-2 py-1 rounded-md text-xs flex items-center gap-1.5 shadow-md">
                          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          失败
                        </div>
                      )}
                      {image.processStatus === 'pending' && (
                        <div className="bg-gray-500/90 backdrop-blur-sm text-white px-2 py-1 rounded-md text-xs shadow-md">
                          待处理
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* 删除按钮 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // 阻止触发预览
                      handleRemoveImage(image.id);
                    }}
                    className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    aria-label="删除图片"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  
                  {/* 点击提示 */}
                  {image.processedUrl && (
                    <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      点击查看大图
                    </div>
                  )}
                  
                  {/* 错误提示和操作按钮 */}
                  {image.processError && (
                    <div 
                      className="absolute bottom-0 left-0 right-0 bg-red-500/95 text-white rounded-b-lg"
                      onClick={(e) => e.stopPropagation()} // 阻止触发预览
                    >
                      <div className="px-3 py-2 space-y-2">
                        {/* 错误信息 - 允许换行 */}
                        <div className="text-xs leading-relaxed break-words">
                          {image.processError}
                        </div>
                        
                        {/* 操作按钮 */}
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              // 重试单张图片
                              setImages((prev) =>
                                prev.map((img) =>
                                  img.id === image.id
                                    ? { ...img, processStatus: 'processing' as ImageProcessStatus, processError: undefined, canUseOriginal: undefined }
                                    : img
                                )
                              );
                              
                              try {
                                const processedImageUrl = await removeBackground(image.file);
                                setImages((prev) =>
                                  prev.map((img) =>
                                    img.id === image.id
                                      ? {
                                          ...img,
                                          processStatus: 'completed' as ImageProcessStatus,
                                          processedUrl: processedImageUrl,
                                          processError: undefined,
                                          canUseOriginal: undefined,
                                        }
                                      : img
                                  )
                                );
                              } catch (error) {
                                let errorMessage = error instanceof Error ? error.message : '抠图失败';
                                let canUseOriginal = false;
                                
                                if (error instanceof Error) {
                                  const errorAny = error as any;
                                  if (errorAny.canUseOriginal !== undefined) {
                                    canUseOriginal = errorAny.canUseOriginal;
                                  }
                                  if (errorMessage.includes('无法识别')) {
                                    canUseOriginal = true;
                                  }
                                }
                                
                                setImages((prev) =>
                                  prev.map((img) =>
                                    img.id === image.id
                                      ? {
                                          ...img,
                                          processStatus: 'failed' as ImageProcessStatus,
                                          processError: errorMessage,
                                          canUseOriginal: canUseOriginal,
                                        }
                                      : img
                                  )
                                );
                              }
                            }}
                            className="flex-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-xs text-center transition-colors"
                          >
                            重试
                          </button>
                          {image.canUseOriginal && (
                            <button
                              onClick={() => {
                                // 使用原图继续
                                setImages((prev) =>
                                  prev.map((img) =>
                                    img.id === image.id
                                      ? {
                                          ...img,
                                          processStatus: 'completed' as ImageProcessStatus,
                                          processedUrl: img.url, // 使用原图作为处理后的图片
                                          processError: undefined,
                                          canUseOriginal: undefined,
                                        }
                                      : img
                                  )
                                );
                              }}
                              className="flex-1 px-3 py-1.5 bg-green-500/80 hover:bg-green-500 rounded text-xs text-center transition-colors"
                            >
                              使用原图继续
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* 处理进度统计 */}
            {isProcessing && (
              <div className="mt-4 text-sm text-text-secondary bg-bg-card border border-default rounded-lg p-4">
                正在处理图片，请稍候...
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-4 mt-8">
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 border border-default rounded-md hover:bg-bg-hover transition-all duration-normal"
          >
            返回
          </button>
          <button
            onClick={handleContinue}
            disabled={images.length === 0}
            className="px-6 py-3 bg-accent-primary text-black rounded-md hover:bg-accent-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-normal font-medium shadow-md hover:shadow-lg"
          >
            继续编辑
          </button>
        </div>
      </div>

      {/* 图片预览模态框 */}
      <ImagePreviewModal
        image={previewImage}
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
}

