'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useJournalStore } from '@/store/journal-store';
import { ImageFile } from '@/types';
import IngredientsInput from '@/components/IngredientsInput';
import TextEditor from '@/components/TextEditor';
import CanvasEditor from '@/components/CanvasEditor';
import DraggableText from '@/components/DraggableText';
import DraggableImage from '@/components/DraggableImage';
import ResizablePanel from '@/components/ResizablePanel';
import ExportDialog from '@/components/ExportDialog';
import CanvasContainer from '@/components/CanvasContainer';
import { generateText } from '@/lib/generate-text';
import { autoLayout } from '@/lib/auto-layout';
import { TextElement } from '@/types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, CANVAS_PADDING } from '@/components/CanvasContainer';

function EditPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const {
    pages,
    currentPageIndex,
    styleConfig,
    addImageToPage,
    updateImageInPage,
    addTextToPage,
    updateText,
    removeTextFromPage,
    updateStyle,
    addPage,
    setCurrentPage,
  } = useJournalStore();
  
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  const handleSignOut = async () => {
    await signOut({ 
      callbackUrl: '/login',
      redirect: true 
    });
  };

  const [ingredients, setIngredients] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [feeling, setFeeling] = useState('');
  const [customText, setCustomText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);

  // ESC键退出截图模式
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isScreenshotMode) {
        setIsScreenshotMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isScreenshotMode]);

  const currentPage = pages[currentPageIndex];

  // 获取选中的元素（必须在 currentPage 定义之后）
  const selectedText = selectedTextId
    ? currentPage.texts.find((t) => t.id === selectedTextId)
    : null;
  const selectedImage = selectedImageId
    ? currentPage.images.find((img) => img.id === selectedImageId)
    : null;

  useEffect(() => {
    // 从 sessionStorage 中获取图片数据（避免 URL 过长）
    const fromParam = searchParams.get('from');
    console.log('Edit page loaded, from param:', fromParam);
    
    if (fromParam === 'upload') {
      try {
        const imagesDataStr = sessionStorage.getItem('uploadedImages');
        console.log('Images data from sessionStorage:', imagesDataStr ? 'found' : 'not found');
        
        if (imagesDataStr) {
          const imagesData = JSON.parse(imagesDataStr);
          console.log('Parsed images data:', imagesData.length, 'images');
          
          // 检查当前页面是否已有图片，避免重复添加
          if (currentPage.images.length === 0) {
            console.log('Adding images to page...');
            // 将数据转换为 ImageFile 格式
            // 注意：由于 File 对象无法序列化，我们创建一个虚拟的 File 对象
            // 如果需要重新处理图片，可以从 URL 重新获取 File 对象
            for (const imgData of imagesData) {
              // 创建一个虚拟的 File 对象（仅用于类型兼容）
              // 如果后续需要重新处理，可以从 URL 转换
              const virtualFile = new File([], `image-${imgData.id}.png`, { type: 'image/png' });
              
              const imageFile: ImageFile = {
                id: imgData.id,
                file: virtualFile,
                url: imgData.url,
                processedUrl: imgData.processedUrl,
                width: imgData.width,
                height: imgData.height,
                processStatus: imgData.processStatus,
                processError: imgData.processError,
                canUseOriginal: imgData.canUseOriginal,
              };
              
              addImageToPage(imageFile);
            }
            
            console.log('Images added successfully');
            // 清除 sessionStorage 中的数据
            sessionStorage.removeItem('uploadedImages');
          } else {
            console.log('Page already has images, skipping');
          }
        } else {
          console.warn('No images data found in sessionStorage');
        }
      } catch (e) {
        console.error('解析图片数据失败:', e);
        sessionStorage.removeItem('uploadedImages');
      }
    }
  }, [searchParams, addImageToPage, currentPage.images.length]);

  const handleGenerateText = async () => {
    setIsGenerating(true);
    try {
      console.log('开始生成文字，食材列表:', ingredients);
      const result = await generateText(ingredients);
      console.log('生成结果:', result);
      setDate(result.date);
      setTitle(result.title);
      setFeeling(result.feeling);
    } catch (error) {
      console.error('生成文字失败:', error);
      const errorMessage = error instanceof Error ? error.message : '生成文字失败，请稍后重试';
      alert(`生成文字失败：${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddText = (type: 'ingredients' | 'feeling' | 'date' | 'title' | 'decorative') => {
    let content = '';
    if (type === 'ingredients') {
      content = ingredients.map((ing, i) => `${i + 1}. ${ing}`).join('\n');
    } else if (type === 'title') {
      content = title;
    } else if (type === 'date') {
      content = date;
    } else if (type === 'feeling') {
      content = feeling;
    } else if (type === 'decorative') {
      content = customText;
    }

    if (!content) return;

    const textElement: any = {
      id: `text-${Date.now()}-${Math.random()}`,
      type,
      content,
      x: 100,
      y: 100,
      fontSize: type === 'ingredients' ? 18 : type === 'feeling' ? 20 : 16,
      color: styleConfig.fontColor,
      fontFamily: 'ELHandwritten, cursive',
    };

    addTextToPage(textElement);
    
    // 如果是自定义文本，添加后清空输入框
    if (type === 'decorative') {
      setCustomText('');
    }
  };

  // 处理图片更新
  const handleImageUpdate = (imageId: string, updates: Partial<ImageFile>) => {
    updateImageInPage(imageId, updates);
  };

  // 自动排版功能
  const handleAutoLayout = () => {
    const layout = autoLayout(currentPage.images, currentPage.texts, {
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
      padding: CANVAS_PADDING,
    });

    // 更新图片位置和缩放
    layout.images.forEach(({ id, x, y, scale, rotation }) => {
      updateImageInPage(id, { x, y, scale, rotation });
    });

    // 更新文字位置
    layout.texts.forEach(({ id, x, y }) => {
      updateText(id, { x, y });
    });

    alert('自动排版完成！图片和文字位置已自动调整。');
  };

  // 获取正在编辑的图片
  const editingImage = editingImageId
    ? currentPage.images.find((img) => img.id === editingImageId)
    : null;

  // 如果有正在编辑的图片，显示编辑界面
  if (editingImage) {
    return (
      <CanvasEditor
        image={editingImage}
        onImageUpdate={handleImageUpdate}
        onBack={() => setEditingImageId(null)}
      />
    );
  }

  // 截图模式：隐藏所有UI，只显示画布
  if (isScreenshotMode) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <CanvasContainer
          backgroundColor={currentPage.backgroundColor || styleConfig.backgroundColor}
          showBoundary={false}
        >
          {/* 图片预览 */}
          {currentPage.images.map((image) => (
            <DraggableImage
              key={image.id}
              image={image}
              onUpdate={updateImageInPage}
              onSelect={() => {}}
              onEdit={() => {}}
              isSelected={false}
              canvasBounds={{
                width: CANVAS_WIDTH - CANVAS_PADDING * 2,
                height: CANVAS_HEIGHT - CANVAS_PADDING * 2,
              }}
            />
          ))}

          {/* 文字元素 */}
          {currentPage.texts.map((text) => (
            <DraggableText
              key={text.id}
              text={text}
              onUpdate={updateText}
              onDelete={() => {}}
              onSelect={() => {}}
              isSelected={false}
              canvasBounds={{
                width: CANVAS_WIDTH - CANVAS_PADDING * 2,
                height: CANVAS_HEIGHT - CANVAS_PADDING * 2,
              }}
            />
          ))}
        </CanvasContainer>
        
        {/* 退出按钮和提示 */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/90 text-white px-6 py-3 rounded-lg z-10 flex items-center gap-4">
          <div className="text-sm">
            <div className="font-semibold mb-1">📸 截图模式已启用</div>
            <div className="text-xs text-white/70">
              使用系统截图工具（Windows: Win+Shift+S, Mac: Cmd+Shift+4）截取画布
            </div>
          </div>
          <button
            onClick={() => setIsScreenshotMode(false)}
            className="px-4 py-2 bg-white text-black rounded-md hover:bg-gray-200 font-medium"
          >
            退出 (ESC)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-bg-primary text-text-primary overflow-hidden">
      {/* 左侧工具栏 - 可调整大小 */}
      <ResizablePanel defaultWidth={480} minWidth={300} maxWidth={600} side="left">
        <div className="h-full border-r border-default bg-bg-secondary p-6 overflow-y-auto">
          <h2 className="text-2xl font-bold mb-6">编辑工具</h2>

        {/* 样式设置 */}
        <div className="mb-8 bg-bg-card border border-default rounded-lg p-4 space-y-4">
          <h3 className="text-lg font-semibold text-text-primary">样式设置</h3>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="block text-sm text-text-secondary">背景色</label>
              <input
                type="color"
                value={styleConfig.backgroundColor}
                onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                className="w-full h-10 rounded-md border border-default cursor-pointer"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm text-text-secondary">字体颜色</label>
              <input
                type="color"
                value={styleConfig.fontColor}
                onChange={(e) => updateStyle({ fontColor: e.target.value })}
                className="w-full h-10 rounded-md border border-default cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 文字输入 */}
        <div className="mb-8 bg-white border border-gray-200 rounded-lg p-4 space-y-4 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">文字内容</h3>
          
          <IngredientsInput value={ingredients} onChange={setIngredients} />
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">日期</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="2025.01.07"
                className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none transition-all duration-normal"
              />
              <button
                onClick={() => handleAddText('date')}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-normal text-gray-700"
                disabled={!date.trim()}
              >
                添加
              </button>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">标题</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="美食名称"
                className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none transition-all duration-normal"
              />
              <button
                onClick={() => handleAddText('title')}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-normal text-gray-700"
                disabled={!title.trim()}
              >
                添加
              </button>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">吃后感</label>
            <div className="flex gap-2">
              <textarea
                value={feeling}
                onChange={(e) => setFeeling(e.target.value)}
                placeholder="一句话感受"
                className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none resize-none transition-all duration-normal"
                rows={3}
              />
              <button
                onClick={() => handleAddText('feeling')}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 whitespace-nowrap self-start disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-normal text-gray-700"
                disabled={!feeling.trim()}
              >
                添加
              </button>
            </div>
          </div>

          <button
            onClick={handleGenerateText}
            disabled={isGenerating}
            className="w-full px-4 py-3 bg-accent-primary text-black rounded-md hover:bg-accent-secondary disabled:opacity-50 transition-all duration-normal font-medium shadow-md hover:shadow-lg"
          >
            {isGenerating ? '生成中...' : 'AI生成文字'}
          </button>
          
          <div className="pt-2">
            <button
              onClick={() => handleAddText('ingredients')}
              className="w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-normal text-gray-700"
              disabled={ingredients.length === 0}
            >
              添加食材列表
            </button>
          </div>

          {/* 自定义文本工具 */}
          <div className="pt-4 border-t border-white/20 mt-4">
            <h3 className="text-lg font-semibold mb-4">文本工具</h3>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white">自定义文本</label>
              <div className="flex gap-2">
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="输入任意文本内容..."
                  className="flex-1 rounded-md border border-white/20 bg-black/50 px-4 py-2 text-white placeholder-gray-500 focus:border-white focus:outline-none resize-none"
                  rows={3}
                />
                <button
                  onClick={() => handleAddText('decorative')}
                  className="px-4 py-2 border border-white/30 rounded-md hover:bg-white/10 whitespace-nowrap self-start disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!customText.trim()}
                >
                  添加
                </button>
              </div>
              <p className="text-xs text-white/60">
                添加自定义文本到画布，可用于装饰性文字等
              </p>
            </div>
          </div>
        </div>

        {/* 排版工具 */}
        <div className="mt-8 bg-white border border-gray-200 rounded-lg p-4 space-y-2 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">排版工具</h3>
          <button
            onClick={handleAutoLayout}
            className="w-full px-4 py-3 bg-accent-primary hover:bg-accent-secondary rounded-md text-black font-medium transition-all duration-normal shadow-md hover:shadow-lg"
          >
            ✨ 自动排版
          </button>
          <p className="text-xs text-text-tertiary mt-2">
            自动调整文字位置，创建最佳布局
          </p>
        </div>
        </div>
      </ResizablePanel>

      {/* 中间预览区 */}
      <div className="flex-1 flex flex-col">
        <div className="border-b border-gray-200 bg-white p-4 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/upload')}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-all duration-normal text-gray-700"
            >
              ← 返回上传
            </button>
            {pages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index)}
                className={`px-4 py-2 rounded-md transition-all duration-normal ${
                  index === currentPageIndex
                    ? 'bg-gray-900 text-black shadow-md'
                    : 'bg-white hover:bg-gray-50 border border-gray-300 text-gray-700'
                }`}
              >
                第 {index + 1} 页
              </button>
            ))}
            <button
              onClick={addPage}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-all duration-normal text-gray-700"
            >
              + 新页面
            </button>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsScreenshotMode(!isScreenshotMode)}
              className={`px-4 py-2 rounded-md font-medium transition-all duration-normal ${
                isScreenshotMode
                  ? 'bg-green-500 hover:bg-green-600 text-black shadow-md'
                  : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
              }`}
            >
              {isScreenshotMode ? '📸 退出截图模式' : '📸 截图模式'}
            </button>
            <button
              onClick={() => setIsExportDialogOpen(true)}
              className="px-4 py-2 bg-gray-900 hover:bg-gray-800 rounded-md text-black font-medium transition-all duration-normal shadow-md hover:shadow-lg"
            >
              📥 导出
            </button>
            {session?.user?.email && (
              <span className="text-sm text-gray-600 hidden sm:inline">{session.user.email}</span>
            )}
            <button
              onClick={handleSignOut}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-all duration-normal text-sm text-gray-700"
            >
              退出登录
            </button>
          </div>
        </div>

        <div
          className="flex-1 p-8 overflow-auto"
          style={{ backgroundColor: styleConfig.backgroundColor }}
        >
          <CanvasContainer
            backgroundColor={currentPage.backgroundColor || styleConfig.backgroundColor}
            showBoundary={!isScreenshotMode}
          >
            {/* 图片预览 - 可拖拽、缩放、旋转 */}
            {currentPage.images.map((image) => (
              <DraggableImage
                key={image.id}
                image={image}
                onUpdate={updateImageInPage}
                onSelect={(id) => {
                  // 取消文字选中，选中图片
                  setSelectedTextId(null);
                  setSelectedImageId(id);
                }}
                onEdit={setEditingImageId}
                isSelected={selectedImageId === image.id && !isScreenshotMode}
                canvasBounds={{
                  width: CANVAS_WIDTH - CANVAS_PADDING * 2,
                  height: CANVAS_HEIGHT - CANVAS_PADDING * 2,
                }}
              />
            ))}

            {/* 文字元素 - 可拖拽 */}
            {currentPage.texts.map((text) => (
              <DraggableText
                key={text.id}
                text={text}
                onUpdate={updateText}
                onDelete={removeTextFromPage}
                onSelect={setSelectedTextId}
                isSelected={selectedTextId === text.id && !isScreenshotMode}
                canvasBounds={{
                  width: CANVAS_WIDTH - CANVAS_PADDING * 2,
                  height: CANVAS_HEIGHT - CANVAS_PADDING * 2,
                }}
              />
            ))}
          </CanvasContainer>
        </div>
      </div>

      {/* 右侧属性面板 - 可调整大小 */}
      <ResizablePanel defaultWidth={320} minWidth={250} maxWidth={500} side="right">
        <div className="h-full border-l border-white/20 p-6 overflow-y-auto">
          <h2 className="text-2xl font-bold mb-6">属性</h2>
          
          {selectedText ? (
            <div className="space-y-6 bg-bg-card border border-default rounded-lg p-4">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-text-primary">文字属性</h3>
                <div className="space-y-4">
                  {/* 字体大小 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">字体大小</label>
                      <span className="text-sm text-gray-500">{selectedText.fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="12"
                      max="48"
                      value={selectedText.fontSize}
                      onChange={(e) => updateText(selectedText.id, { fontSize: Number(e.target.value) })}
                      className="w-full h-2 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-white"
                    />
                  </div>

                  {/* 字体颜色 */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">字体颜色</label>
                    <input
                      type="color"
                      value={selectedText.color}
                      onChange={(e) => updateText(selectedText.id, { color: e.target.value })}
                      className="w-full h-10 rounded-md cursor-pointer border border-gray-300"
                    />
                  </div>

                  {/* 内容编辑 */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">内容</label>
                    {selectedText.type === 'ingredients' ? (
                      <textarea
                        value={selectedText.content}
                        onChange={(e) => updateText(selectedText.id, { content: e.target.value })}
                        className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none resize-none transition-all duration-normal"
                        rows={6}
                      />
                    ) : (
                      <input
                        type="text"
                        value={selectedText.content}
                        onChange={(e) => updateText(selectedText.id, { content: e.target.value })}
                        className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none transition-all duration-normal"
                      />
                    )}
                  </div>

                  {/* 删除按钮 */}
                  <button
                    onClick={() => {
                      removeTextFromPage(selectedText.id);
                      setSelectedTextId(null);
                    }}
                    className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 rounded-md text-black transition-all duration-normal shadow-md hover:shadow-lg"
                  >
                    删除文字
                  </button>
                </div>
              </div>
            </div>
          ) : selectedImage ? (
            <div className="space-y-6 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">图片属性</h3>
                <div className="space-y-4">
                  {/* 缩放比例 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">缩放比例</label>
                      <span className="text-sm text-gray-500">{((selectedImage.scale || 1) * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="300"
                      value={(selectedImage.scale || 1) * 100}
                      onChange={(e) => updateImageInPage(selectedImage.id, { scale: Number(e.target.value) / 100 })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-800"
                    />
                  </div>

                  {/* 旋转角度 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">旋转角度</label>
                      <span className="text-sm text-gray-500">{selectedImage.rotation || 0}°</span>
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={selectedImage.rotation || 0}
                      onChange={(e) => updateImageInPage(selectedImage.id, { rotation: Number(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-800"
                    />
                  </div>

                  {/* 编辑按钮 */}
                  <button
                    onClick={() => setEditingImageId(selectedImage.id)}
                    className="w-full px-4 py-2 bg-accent-primary hover:bg-accent-secondary rounded-md text-black transition-all duration-normal shadow-md hover:shadow-lg font-medium"
                  >
                    编辑图片
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">
              <p>选择画布上的文字或图片以编辑属性</p>
            </div>
          )}
        </div>
      </ResizablePanel>

      {/* 导出对话框 */}
      <ExportDialog
        pages={pages}
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
      />
    </div>
  );
}

export default function EditPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-bg-primary text-text-primary">
        <p>加载中...</p>
      </div>
    }>
      <EditPageContent />
    </Suspense>
  );
}
