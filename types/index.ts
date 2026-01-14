// 图片处理状态
export type ImageProcessStatus = 'pending' | 'processing' | 'completed' | 'failed';

// 图片相关类型
export interface ImageFile {
  id: string;
  file: File;
  url: string;
  processedUrl?: string; // 抠图后的URL
  editedUrl?: string; // 编辑后的URL（擦除后）
  borderedUrl?: string; // 添加边框后的URL
  width: number;
  height: number;
  processStatus?: ImageProcessStatus; // 处理状态
  processError?: string; // 处理错误信息
  canUseOriginal?: boolean; // 是否可以使用原图（当抠图失败时）
  // 布局和变换属性
  x?: number; // X坐标位置
  y?: number; // Y坐标位置
  scale?: number; // 缩放比例（默认1）
  rotation?: number; // 旋转角度（度，默认0）
}

// 文字元素类型
export interface TextElement {
  id: string;
  type: 'ingredients' | 'feeling' | 'date' | 'title' | 'decorative';
  content: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
}

// 手帐页面类型
export interface JournalPage {
  id: string;
  images: ImageFile[];
  texts: TextElement[];
  backgroundColor: string;
  borderColor: string;
}

// 手帐项目类型
export interface JournalProject {
  id: string;
  name: string;
  pages: JournalPage[];
  createdAt: Date;
  updatedAt: Date;
}

// AI生成内容类型
export interface AIGeneratedContent {
  date: string;
  title: string;
  feeling: string;
}

// 样式配置类型
export interface StyleConfig {
  backgroundColor: string;
  fontColor: string;
  borderColor: string;
}

