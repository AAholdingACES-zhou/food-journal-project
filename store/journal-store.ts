import { create } from 'zustand';
import { JournalPage, ImageFile, TextElement, StyleConfig } from '@/types';
import { DEFAULT_STYLE, MAX_IMAGES_PER_PAGE } from '@/lib/constants';

interface JournalStore {
  pages: JournalPage[];
  currentPageIndex: number;
  styleConfig: StyleConfig;
  
  // Actions
  addPage: () => void;
  setCurrentPage: (index: number) => void;
  addImageToPage: (image: ImageFile, pageIndex?: number) => void;
  updateImageInPage: (imageId: string, updates: Partial<ImageFile>, pageIndex?: number) => void;
  removeImageFromPage: (imageId: string, pageIndex?: number) => void;
  addTextToPage: (text: TextElement, pageIndex?: number) => void;
  updateText: (textId: string, updates: Partial<TextElement>, pageIndex?: number) => void;
  removeTextFromPage: (textId: string, pageIndex?: number) => void;
  updateStyle: (style: Partial<StyleConfig>) => void;
  reset: () => void;
}

const createEmptyPage = (): JournalPage => ({
  id: `page-${Date.now()}-${Math.random()}`,
  images: [],
  texts: [],
  backgroundColor: DEFAULT_STYLE.backgroundColor,
  borderColor: DEFAULT_STYLE.borderColor,
});

export const useJournalStore = create<JournalStore>((set) => ({
  pages: [createEmptyPage()],
  currentPageIndex: 0,
  styleConfig: DEFAULT_STYLE,

  addPage: () => set((state) => ({
    pages: [...state.pages, createEmptyPage()],
    currentPageIndex: state.pages.length,
  })),

  setCurrentPage: (index) => set({ currentPageIndex: index }),

  addImageToPage: (image, pageIndex) => set((state) => {
    const targetPageIndex = pageIndex ?? state.currentPageIndex;
    const page = state.pages[targetPageIndex];
    
    // 检查是否超过每页最大图片数
    if (page.images.length >= MAX_IMAGES_PER_PAGE) {
      // 如果当前页已满，创建新页
      if (targetPageIndex === state.currentPageIndex) {
        const newPage = createEmptyPage();
        newPage.images.push(image);
        return {
          pages: [...state.pages, newPage],
          currentPageIndex: state.pages.length,
        };
      }
      return state; // 如果指定页面已满，不添加
    }

    const newPages = [...state.pages];
    newPages[targetPageIndex] = {
      ...page,
      images: [...page.images, image],
    };
    return { pages: newPages };
  }),

  updateImageInPage: (imageId, updates, pageIndex) => set((state) => {
    const targetPageIndex = pageIndex ?? state.currentPageIndex;
    const page = state.pages[targetPageIndex];
    const newPages = [...state.pages];
    newPages[targetPageIndex] = {
      ...page,
      images: page.images.map((img) =>
        img.id === imageId ? { ...img, ...updates } : img
      ),
    };
    return { pages: newPages };
  }),

  removeImageFromPage: (imageId, pageIndex) => set((state) => {
    const targetPageIndex = pageIndex ?? state.currentPageIndex;
    const page = state.pages[targetPageIndex];
    const newPages = [...state.pages];
    newPages[targetPageIndex] = {
      ...page,
      images: page.images.filter((img) => img.id !== imageId),
    };
    return { pages: newPages };
  }),

  addTextToPage: (text, pageIndex) => set((state) => {
    const targetPageIndex = pageIndex ?? state.currentPageIndex;
    const page = state.pages[targetPageIndex];
    const newPages = [...state.pages];
    newPages[targetPageIndex] = {
      ...page,
      texts: [...page.texts, text],
    };
    return { pages: newPages };
  }),

  updateText: (textId, updates, pageIndex) => set((state) => {
    const targetPageIndex = pageIndex ?? state.currentPageIndex;
    const page = state.pages[targetPageIndex];
    const newPages = [...state.pages];
    newPages[targetPageIndex] = {
      ...page,
      texts: page.texts.map((text) =>
        text.id === textId ? { ...text, ...updates } : text
      ),
    };
    return { pages: newPages };
  }),

  removeTextFromPage: (textId, pageIndex) => set((state) => {
    const targetPageIndex = pageIndex ?? state.currentPageIndex;
    const page = state.pages[targetPageIndex];
    const newPages = [...state.pages];
    newPages[targetPageIndex] = {
      ...page,
      texts: page.texts.filter((text) => text.id !== textId),
    };
    return { pages: newPages };
  }),

  updateStyle: (style) => set((state) => ({
    styleConfig: { ...state.styleConfig, ...style },
  })),

  reset: () => set({
    pages: [createEmptyPage()],
    currentPageIndex: 0,
    styleConfig: DEFAULT_STYLE,
  }),
}));

