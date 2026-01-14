'use client';

import { useState, useEffect } from 'react';
import ImageEditor from './ImageEditor';
import ContourBorderedImage from './ContourBorderedImage';
import { ImageFile } from '@/types';

interface CanvasEditorProps {
  image: ImageFile;
  onImageUpdate: (imageId: string, updates: Partial<ImageFile>) => void;
  onBack?: () => void;
}

/**
 * 画布编辑器组件
 * 整合图片编辑、边框添加等功能
 */
export default function CanvasEditor({ image, onImageUpdate, onBack }: CanvasEditorProps) {
  const [mode, setMode] = useState<'erase' | 'border' | 'preview'>('erase');
  const [brushSize, setBrushSize] = useState(20);
  const [gapPx, setGapPx] = useState(10);
  const [strokePx, setStrokePx] = useState(8);
  
  // 获取图片源（优先级：borderedUrl > editedUrl > processedUrl > url）
  const getImageSource = () => {
    return image.borderedUrl || image.editedUrl || image.processedUrl || image.url || '';
  };
  
  // 获取初始图片 URL，确保不为空
  const getInitialImageUrl = () => {
    const url = getImageSource();
    if (!url) {
      console.error('CanvasEditor: 图片 URL 为空', image);
    }
    return url || '';
  };
  
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(
    getInitialImageUrl()
  );
  const [borderedImageUrl, setBorderedImageUrl] = useState<string | null>(
    image.borderedUrl || null
  );
  const [isSaving, setIsSaving] = useState(false);
  
  // 当 image prop 变化时，更新 editedImageUrl（使用最新的图片源）
  useEffect(() => {
    const newUrl = getImageSource();
    if (newUrl && newUrl !== editedImageUrl) {
      console.log('CanvasEditor: 更新 editedImageUrl', {
        old: editedImageUrl?.substring(0, 50),
        new: newUrl.substring(0, 50),
        source: image.borderedUrl ? 'borderedUrl' : image.editedUrl ? 'editedUrl' : image.processedUrl ? 'processedUrl' : 'url'
      });
      setEditedImageUrl(newUrl);
    }
  }, [image.borderedUrl, image.editedUrl, image.processedUrl, image.url]);

  // 处理图片编辑完成
  const handleImageEdit = (dataUrl: string) => {
    setEditedImageUrl(dataUrl);
    // 不立即保存，等待用户点击保存按钮
  };

  // 处理边框添加完成
  const handleBorderComplete = (borderedUrl: string) => {
    setBorderedImageUrl(borderedUrl);
    // 不立即保存，等待用户点击保存按钮
  };

  // 保存功能
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates: Partial<ImageFile> = {};
      
      // 保存擦除后的图片（如果与当前图片源不同）
      const currentSource = getImageSource();
      if (editedImageUrl && editedImageUrl !== currentSource) {
        updates.editedUrl = editedImageUrl;
      }
      
      // 保存添加边框后的图片（如果存在）
      if (borderedImageUrl) {
        updates.borderedUrl = borderedImageUrl;
        // 如果添加了边框，同时更新 editedUrl 为带边框的图片（确保一致性）
        updates.editedUrl = borderedImageUrl;
      }
      
      // 如果有更新，则保存
      if (Object.keys(updates).length > 0) {
        onImageUpdate(image.id, updates);
        // 同步更新本地状态，确保后续操作使用最新的图片
        if (updates.editedUrl) {
          setEditedImageUrl(updates.editedUrl);
        }
        if (updates.borderedUrl) {
          setBorderedImageUrl(updates.borderedUrl);
        }
        // 显示保存成功提示
        alert('保存成功！');
      } else {
        alert('没有需要保存的更改');
      }
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  // 获取当前显示的图片URL
  const getCurrentImageUrl = () => {
    if (mode === 'preview' && image.borderedUrl) {
      return image.borderedUrl;
    }
    return editedImageUrl || image.processedUrl || image.url;
  };

  return (
    <div className="flex h-full bg-white text-gray-900">
      {/* 左侧工具栏 */}
      <div className="w-48 border-r border-gray-200 p-4 flex flex-col gap-4 bg-gray-50">
        {onBack && (
          <button
            onClick={onBack}
            className="w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 text-left"
          >
            ← 返回
          </button>
        )}
        
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setMode('erase')}
            className={`w-full px-4 py-2 rounded-md text-left flex items-center gap-2 ${
              mode === 'erase'
                ? 'bg-white text-black'
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            擦除
          </button>
          <button
            onClick={() => setMode('border')}
            className={`w-full px-4 py-2 rounded-md text-left ${
              mode === 'border'
                ? 'bg-white text-black'
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            添加边框
          </button>
          <button
            onClick={() => setMode('preview')}
            className={`w-full px-4 py-2 rounded-md text-left ${
              mode === 'preview'
                ? 'bg-white text-black'
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            预览
          </button>
        </div>
      </div>

      {/* 右侧编辑区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部标题栏 */}
        <div className="border-b border-gray-200 p-4 flex items-center justify-between bg-white">
          <h2 className="text-xl font-bold text-gray-900">图片编辑</h2>
          {/* 保存按钮 */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-black rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all"
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>

        {/* 编辑内容区域 */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-4xl mx-auto">
            {mode === 'erase' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <label className="text-sm text-gray-700">画笔大小:</label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="flex-1 accent-gray-800"
                />
                <span className="text-sm w-12 text-gray-700">{brushSize}px</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-600 mb-2">
                  使用鼠标或触摸在图片上拖动来擦除不需要的部分
                  <br />
                  <span className="text-xs text-gray-500">
                    （棋盘格背景用于显示透明区域）
                  </span>
                </p>
                {(() => {
                  // 确保使用最新的图片源（优先级：editedImageUrl > borderedUrl > editedUrl > processedUrl > url）
                  const imageSrc = editedImageUrl || getImageSource();
                  if (imageSrc) {
                    return (
                      <ImageEditor
                        key={imageSrc.substring(0, 50)} // 使用 key 确保图片源变化时重新初始化
                        src={imageSrc}
                        onImageChange={handleImageEdit}
                        enabled={true}
                        brushSize={brushSize}
                        mode="erase"
                      />
                    );
                  } else {
                    return (
                      <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-600 border border-gray-200">
                        <p>图片加载失败，请检查图片 URL</p>
                        <p className="text-xs mt-2">URL: {image.url || '未提供'}</p>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          )}

          {mode === 'border' && (
            <div className="space-y-4">
              {/* 轮廓参数调节面板 */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-4 border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">轮廓设置</h3>
                
                {/* 轮廓距离滑块 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">轮廓距离</label>
                    <span className="text-sm text-gray-600">{gapPx}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    value={gapPx}
                    onChange={(e) => setGapPx(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-800"
                  />
                  <p className="text-xs text-gray-500">
                    轮廓与主体之间的间隙距离
                  </p>
                </div>

                {/* 轮廓粗细滑块 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">轮廓粗细</label>
                    <span className="text-sm text-gray-600">{strokePx}px</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    step="1"
                    value={strokePx}
                    onChange={(e) => setStrokePx(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-800"
                  />
                  <p className="text-xs text-gray-500">
                    轮廓线条的宽度
                  </p>
                </div>
              </div>

              {/* 边框预览区域 */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <ContourBorderedImage
                  key={`${gapPx}-${strokePx}-${editedImageUrl?.substring(0, 50)}`} // 使用 key 强制重新渲染当参数或图片源改变时
                  src={editedImageUrl || getImageSource()}
                  alt="编辑后的图片"
                  className="max-w-full h-auto rounded-lg"
                  showBorder={true}
                  borderOptions={{
                    color: '#ffffff',
                    gapPx: gapPx,
                    strokePx: strokePx,
                    lineLengthRange: [20, 40],
                    dotSizeRange: [3, 5],
                    spacing: 12,
                    jitterAmount: 1.5,
                  }}
                  onBorderComplete={handleBorderComplete}
                />
              </div>
            </div>
          )}

          {mode === 'preview' && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <img
                src={getCurrentImageUrl()}
                alt="预览"
                className="max-w-full h-auto rounded-lg mx-auto"
              />
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
