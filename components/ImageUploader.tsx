'use client';

import { useCallback, useState } from 'react';
import { ImageFile } from '@/types';
import { MAX_IMAGE_SIZE, ALLOWED_IMAGE_TYPES } from '@/lib/constants';

interface ImageUploaderProps {
  onImagesSelected: (images: ImageFile[]) => void;
  maxImages?: number;
  currentImageCount?: number; // 当前已上传的图片数量
}

export default function ImageUploader({ 
  onImagesSelected, 
  maxImages = 10,
  currentImageCount = 0 
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  const validateFile = (file: File): string | null => {
    // 检查文件大小
    if (file.size > MAX_IMAGE_SIZE) {
      return `图片大小不能超过 ${MAX_IMAGE_SIZE / 1024 / 1024}MB`;
    }

    // 检查文件类型
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return '不支持的图片格式，请上传 JPG、PNG 或 WebP 格式';
    }

    return null;
  };

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles: ImageFile[] = [];
    
    // 计算还能添加多少张图片
    const remainingSlots = maxImages - currentImageCount;
    
    if (remainingSlots <= 0) {
      setError(`最多只能上传 ${maxImages} 张图片，请先删除一些图片`);
      return;
    }

    // 如果尝试上传的图片数量超过剩余槽位，只处理能添加的
    const filesToProcess = fileArray.slice(0, remainingSlots);
    
    if (fileArray.length > remainingSlots) {
      setError(`最多只能上传 ${maxImages} 张图片，已选择 ${fileArray.length} 张，将只添加前 ${remainingSlots} 张`);
    }

    for (const file of filesToProcess) {
      const error = validateFile(file);
      if (error) {
        setError(error);
        continue;
      }

      // 创建预览URL
      const url = URL.createObjectURL(file);

      // 获取图片尺寸
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = () => resolve(null);
        img.onerror = reject;
        img.src = url;
      });

      validFiles.push({
        id: `${Date.now()}-${Math.random()}`,
        file,
        url,
        width: img.width,
        height: img.height,
      });
    }

    if (validFiles.length > 0) {
      onImagesSelected(validFiles);
      // 只有在没有警告信息时才清除错误（如果有数量限制警告，保留它）
      if (fileArray.length <= remainingSlots) {
        setError('');
      }
    }
  }, [onImagesSelected, maxImages, currentImageCount]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  return (
    <div className="w-full">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-lg p-12 text-center transition-all duration-normal
          ${isDragging 
            ? 'border-focus bg-bg-hover shadow-lg border-gray-400' 
            : 'border-default hover:border-hover bg-bg-card border-gray-300'
          }
        `}
      >
        <input
          type="file"
          id="image-upload"
          multiple
          accept={ALLOWED_IMAGE_TYPES.join(',')}
          onChange={handleFileInput}
          className="hidden"
        />
        <label
          htmlFor="image-upload"
          className="cursor-pointer block"
        >
          <svg
            className={`mx-auto h-12 w-12 mb-4 transition-colors duration-normal ${
              isDragging ? 'text-gray-700' : 'text-gray-400'
            }`}
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="text-lg font-medium text-text-primary mb-2">
            拖拽图片到这里，或点击选择
          </p>
          <p className="text-sm text-text-secondary">
            支持 JPG、PNG、WebP 格式，单张不超过 5MB，最多上传 {maxImages} 张
          </p>
        </label>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-400 shadow-md">
          {error}
        </div>
      )}
    </div>
  );
}

