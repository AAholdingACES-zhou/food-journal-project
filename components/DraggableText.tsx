'use client';

import { useState, useRef, useEffect } from 'react';
import { TextElement } from '@/types';

interface DraggableTextProps {
  text: TextElement;
  onUpdate: (id: string, updates: Partial<TextElement>) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  isSelected: boolean;
  canvasBounds?: {
    width: number;
    height: number;
  };
}

/**
 * 可拖拽的文字元素组件
 * 支持拖拽调整位置、点击编辑、删除
 */
export default function DraggableText({
  text,
  onUpdate,
  onDelete,
  onSelect,
  isSelected,
  canvasBounds,
}: DraggableTextProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(text.content);
  const textRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // 当文字被选中时，聚焦输入框
  useEffect(() => {
    if (isSelected && isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isSelected, isEditing]);

  // 开始拖拽
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    if (!textRef.current) return;
    
    const rect = textRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
    onSelect(text.id);
  };

  // 拖拽中
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !textRef.current) return;
    
    const container = textRef.current.parentElement;
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const newX = e.clientX - containerRect.left - dragOffset.x;
    const newY = e.clientY - containerRect.top - dragOffset.y;
    
    // 限制在容器内
    const textWidth = textRef.current.offsetWidth || 100;
    const textHeight = textRef.current.offsetHeight || 50;
    
    // 使用canvasBounds如果提供，否则使用容器尺寸
    const maxWidth = canvasBounds?.width ?? containerRect.width;
    const maxHeight = canvasBounds?.height ?? containerRect.height;
    const maxX = Math.max(0, maxWidth - textWidth);
    const maxY = Math.max(0, maxHeight - textHeight);
    
    onUpdate(text.id, {
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  };

  // 结束拖拽
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 添加全局鼠标事件监听
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // 双击编辑
  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditContent(text.content);
    onSelect(text.id);
  };

  // 保存编辑
  const handleSaveEdit = () => {
    if (editContent.trim()) {
      onUpdate(text.id, { content: editContent.trim() });
    }
    setIsEditing(false);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditContent(text.content);
    setIsEditing(false);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    } else if (e.key === 'Delete' && isSelected && !isEditing) {
      onDelete(text.id);
    }
  };

  // 格式化内容显示（支持bullet points和序号）
  const formatContent = (content: string, type: TextElement['type']) => {
    if (type === 'ingredients') {
      // 食材列表：每行添加bullet point
      return content.split('\n').map((line, index) => (
        <span key={index}>
          {line.trim() && '• '}
          {line}
          {index < content.split('\n').length - 1 && <br />}
        </span>
      ));
    }
    return content;
  };

  const isMultiline = text.type === 'ingredients' || text.content.includes('\n');

  return (
    <div
      ref={textRef}
      className={`absolute cursor-move select-none ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      } ${isDragging ? 'opacity-80' : ''}`}
      style={{
        left: `${text.x}px`,
        top: `${text.y}px`,
        color: text.color,
        fontSize: `${text.fontSize}px`,
        fontFamily: text.fontFamily,
        zIndex: isSelected ? 10 : 1,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {isEditing ? (
        <div className="bg-black/80 p-2 rounded border border-white/30 min-w-[200px]">
          {isMultiline ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onBlur={handleSaveEdit}
              className="w-full bg-transparent text-white border-none outline-none resize-none"
              rows={Math.max(3, editContent.split('\n').length)}
              autoFocus
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onBlur={handleSaveEdit}
              className="w-full bg-transparent text-white border-none outline-none"
              autoFocus
            />
          )}
          <div className="flex gap-2 mt-2 text-xs">
            <button
              onClick={handleSaveEdit}
              className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-black"
            >
              保存
            </button>
            <button
              onClick={handleCancelEdit}
              className="px-2 py-1 bg-gray-600 hover:bg-gray-700 rounded text-black"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className="relative group">
          <div className="font-handwritten whitespace-pre-wrap">
            {formatContent(text.content, text.type)}
          </div>
          {isSelected && (
            <button
              onClick={() => onDelete(text.id)}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-black text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              title="删除 (Delete键)"
            >
              ×
            </button>
          )}
        </div>
      )}
    </div>
  );
}
