'use client';

import { useState } from 'react';
import { TextElement } from '@/types';

interface TextEditorProps {
  type: TextElement['type'];
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}

export default function TextEditor({
  type,
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
}: TextEditorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-white">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border border-white/20 bg-black/50 px-4 py-2 text-white placeholder-gray-500 focus:border-white focus:outline-none resize-none"
          rows={4}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border border-white/20 bg-black/50 px-4 py-2 text-white placeholder-gray-500 focus:border-white focus:outline-none"
        />
      )}
    </div>
  );
}

