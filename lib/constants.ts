// 图片大小限制 (5MB)
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

// 支持的图片格式
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// 每页最多图片数量
export const MAX_IMAGES_PER_PAGE = 2;

// 默认样式
export const DEFAULT_STYLE: {
  backgroundColor: string;
  fontColor: string;
  borderColor: string;
} = {
  backgroundColor: '#000000', // 黑色
  fontColor: '#ffffff', // 白色
  borderColor: '#ffffff', // 白色
};

// 手写体字体列表
export const HANDWRITING_FONTS = [
  '站酷手写体',
  '汉仪手写体',
  'Comic Sans MS',
  'Kalam',
  'Caveat',
];

// 画布尺寸（固定尺寸，确保导出一致性）
export const CANVAS_WIDTH = 1200; // 画布宽度（像素）
export const CANVAS_HEIGHT = 1600; // 画布高度（像素）
export const CANVAS_PADDING = 40; // 画布内边距（像素）
