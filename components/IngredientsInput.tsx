'use client';

import { useState } from 'react';
import TextEditor from './TextEditor';

interface IngredientsInputProps {
  value: string[];
  onChange: (ingredients: string[]) => void;
}

export default function IngredientsInput({ value, onChange }: IngredientsInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    if (inputValue.trim()) {
      onChange([...value, inputValue.trim()]);
      setInputValue('');
    }
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text-secondary">
        食材列表
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入食材名称和用量，如：辣皮子 30g"
          className="flex-1 rounded-md border border-default bg-bg-secondary px-4 py-2 text-text-primary placeholder-text-tertiary focus:border-focus focus:outline-none transition-all duration-normal"
        />
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-accent-primary text-black rounded-md hover:bg-accent-secondary transition-all duration-normal font-medium shadow-md hover:shadow-lg"
        >
          添加
        </button>
      </div>
      <div className="space-y-2">
        {value.map((ingredient, index) => (
          <div
            key={index}
            className="flex items-center justify-between rounded-md border border-default bg-bg-secondary px-4 py-2 hover:bg-bg-hover transition-all duration-normal"
          >
            <span className="text-text-primary">
              {index + 1}. {ingredient}
            </span>
            <button
              onClick={() => handleRemove(index)}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

