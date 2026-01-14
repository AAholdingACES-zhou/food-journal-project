'use client';

import { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { JournalPage, ImageFile, TextElement } from '@/types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, CANVAS_PADDING } from '@/lib/constants';

interface ExportDialogProps {
  pages: JournalPage[];
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 导出对话框组件
 * 支持PNG和PDF导出
 */
export default function ExportDialog({ pages, isOpen, onClose }: ExportDialogProps) {
  const [exportType, setExportType] = useState<'png' | 'pdf'>('png');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportScale, setExportScale] = useState(2); // 导出缩放比例（用于高清）
  const previewRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 渲染页面内容到预览容器
  const renderPageContent = (page: JournalPage, container: HTMLDivElement) => {
    container.innerHTML = '';
    container.style.backgroundColor = page.backgroundColor || '#000000';
    container.style.position = 'relative';
    container.style.width = `${CANVAS_WIDTH}px`;
    container.style.height = `${CANVAS_HEIGHT}px`;
    container.style.padding = `${CANVAS_PADDING}px`;
    container.style.boxSizing = 'border-box';

    // 渲染图片
    page.images.forEach((image: ImageFile) => {
      const imgElement = document.createElement('img');
      const imageUrl = image.borderedUrl || image.editedUrl || image.processedUrl || image.url;
      imgElement.src = imageUrl;
      imgElement.style.position = 'absolute';
      imgElement.style.left = `${image.x || 0}px`;
      imgElement.style.top = `${image.y || 0}px`;
      imgElement.style.width = `${(image.width || 400) * (image.scale || 1)}px`;
      imgElement.style.height = `${(image.height || 300) * (image.scale || 1)}px`;
      imgElement.style.transform = `rotate(${image.rotation || 0}deg)`;
      imgElement.style.transformOrigin = 'center center';
      imgElement.style.objectFit = 'contain';
      imgElement.style.display = 'block';
      container.appendChild(imgElement);
    });

    // 渲染文字
    page.texts.forEach((text: TextElement) => {
      const textElement = document.createElement('div');
      textElement.style.position = 'absolute';
      textElement.style.left = `${text.x}px`;
      textElement.style.top = `${text.y}px`;
      textElement.style.color = text.color;
      textElement.style.fontSize = `${text.fontSize}px`;
      textElement.style.fontFamily = text.fontFamily;
      textElement.style.whiteSpace = 'pre-wrap';
      textElement.style.zIndex = '10';
      
      // 格式化食材列表
      if (text.type === 'ingredients') {
        const lines = text.content.split('\n');
        textElement.innerHTML = lines
          .map((line) => (line.trim() ? `• ${line}` : line))
          .join('<br>');
      } else {
        textElement.textContent = text.content;
      }
      
      container.appendChild(textElement);
    });
  };

  // 初始化预览引用并渲染内容
  useEffect(() => {
    if (isOpen) {
      previewRefs.current = previewRefs.current.slice(0, pages.length);
      // 延迟渲染，确保DOM已准备好
      setTimeout(() => {
        pages.forEach((page, index) => {
          const container = previewRefs.current[index];
          if (container) {
            renderPageContent(page, container);
          }
        });
      }, 200);
    }
  }, [isOpen, pages]);

  if (!isOpen) return null;

  // 导出单页为PNG
  const exportPageAsPNG = async (pageIndex: number): Promise<string> => {
    const page = pages[pageIndex];
    let previewElement = previewRefs.current[pageIndex];
    
    // 如果预览元素不存在，创建一个临时容器
    if (!previewElement) {
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      document.body.appendChild(tempContainer);
      previewRefs.current[pageIndex] = tempContainer;
      previewElement = tempContainer;
    }

    // 重新渲染页面内容（确保内容是最新的）
    renderPageContent(page, previewElement);

    // 等待图片加载
    const images = previewElement.querySelectorAll('img');
    await Promise.all(
      Array.from(images).map(
        (img) =>
          new Promise<void>((resolve, reject) => {
            if (img.complete && img.naturalWidth > 0) {
              resolve();
            } else {
              const timeout = setTimeout(() => {
                reject(new Error('图片加载超时'));
              }, 10000);
              img.onload = () => {
                clearTimeout(timeout);
                resolve();
              };
              img.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('图片加载失败'));
              };
            }
          })
      )
    );

    // 等待一小段时间确保渲染完成
    await new Promise((resolve) => setTimeout(resolve, 200));

    const canvas = await html2canvas(previewElement, {
      scale: exportScale,
      backgroundColor: page.backgroundColor || '#000000',
      useCORS: true,
      logging: false,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      allowTaint: false,
      windowWidth: CANVAS_WIDTH,
      windowHeight: CANVAS_HEIGHT,
    });

    return canvas.toDataURL('image/png', 1.0);
  };

  // 导出所有页为PNG
  const exportAllAsPNG = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      for (let i = 0; i < pages.length; i++) {
        setExportProgress((i / pages.length) * 100);
        const dataUrl = await exportPageAsPNG(i);
        
        // 创建下载链接
        const link = document.createElement('a');
        link.download = `美食手帐-第${i + 1}页.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // 延迟一下，避免浏览器阻止多个下载
        if (i < pages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      setExportProgress(100);
      alert(`成功导出 ${pages.length} 页PNG图片！`);
      onClose();
    } catch (error) {
      console.error('导出PNG失败:', error);
      alert(`导出失败：${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  // 导出为PDF
  const exportAsPDF = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [1200, 1600], // 默认尺寸，会根据实际内容调整
      });

      for (let i = 0; i < pages.length; i++) {
        setExportProgress((i / pages.length) * 100);
        
        const dataUrl = await exportPageAsPNG(i);
        const previewElement = previewRefs.current[i];
        
        if (!previewElement) continue;

        // 使用固定尺寸
        const width = CANVAS_WIDTH;
        const height = CANVAS_HEIGHT;
        
        // 如果不是第一页，添加新页
        if (i > 0) {
          pdf.addPage([width, height], 'portrait');
        } else {
          // 第一页设置尺寸
          pdf.setPage(1);
          pdf.internal.pageSize.setWidth(width);
          pdf.internal.pageSize.setHeight(height);
        }

        // 添加图片到PDF
        pdf.addImage(dataUrl, 'PNG', 0, 0, width, height, undefined, 'FAST');
      }

      setExportProgress(100);
      pdf.save('美食手帐.pdf');
      alert(`成功导出 ${pages.length} 页PDF文件！`);
      onClose();
    } catch (error) {
      console.error('导出PDF失败:', error);
      alert(`导出失败：${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  // 处理导出
  const handleExport = async () => {
    if (exportType === 'png') {
      await exportAllAsPNG();
    } else {
      await exportAsPDF();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">导出手帐</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none transition-colors"
            disabled={isExporting}
          >
            ×
          </button>
        </div>

        {/* 导出类型选择 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">导出格式</label>
          <div className="flex gap-4">
            <button
              onClick={() => setExportType('png')}
              disabled={isExporting}
              className={`flex-1 px-4 py-3 rounded-md border transition-colors ${
                exportType === 'png'
                  ? 'bg-gray-900 text-black border-gray-900'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              PNG 图片
              <div className="text-xs mt-1 opacity-70">
                {pages.length > 1 ? `将导出 ${pages.length} 个文件` : '单页导出'}
              </div>
            </button>
            <button
              onClick={() => setExportType('pdf')}
              disabled={isExporting}
              className={`flex-1 px-4 py-3 rounded-md border transition-colors ${
                exportType === 'pdf'
                  ? 'bg-gray-900 text-black border-gray-900'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              PDF 文档
              <div className="text-xs mt-1 opacity-70">
                {pages.length > 1 ? `包含 ${pages.length} 页` : '单页文档'}
              </div>
            </button>
          </div>
        </div>

        {/* 导出质量设置 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">导出质量</label>
            <span className="text-sm text-gray-600">
              {exportScale}x {exportScale === 1 ? '(标准)' : exportScale === 2 ? '(高清)' : '(超高清)'}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="3"
            step="1"
            value={exportScale}
            onChange={(e) => setExportScale(Number(e.target.value))}
            disabled={isExporting}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-800 disabled:opacity-50"
          />
          <p className="text-xs text-gray-500 mt-1">
            更高的质量会产生更大的文件，但图片更清晰
          </p>
        </div>

        {/* 预览区域 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">预览</label>
          <div className="space-y-4 max-h-64 overflow-y-auto">
            {pages.map((page, index) => (
              <div key={page.id} className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                <div className="text-xs text-gray-600 mb-2">第 {index + 1} 页</div>
                <div
                  ref={(el) => {
                    previewRefs.current[index] = el;
                  }}
                  className="relative mx-auto"
                  style={{
                    backgroundColor: page.backgroundColor || '#000000',
                    minHeight: '200px',
                    width: '100%',
                    maxWidth: '600px',
                    transform: 'scale(0.3)',
                    transformOrigin: 'top left',
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 进度条 */}
        {isExporting && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-700">导出中...</span>
              <span className="text-sm text-gray-600">{Math.round(exportProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gray-900 h-2 rounded-full transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || pages.length === 0}
            className="flex-1 px-4 py-2 bg-gray-900 text-black rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {isExporting ? '导出中...' : `导出为 ${exportType.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}
