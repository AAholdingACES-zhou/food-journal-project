import { ImageFile, TextElement } from '@/types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, CANVAS_PADDING } from './constants';

interface LayoutConfig {
  canvasWidth: number;
  canvasHeight: number;
  padding: number;
}

const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  canvasWidth: CANVAS_WIDTH,
  canvasHeight: CANVAS_HEIGHT,
  padding: CANVAS_PADDING,
};

/**
 * 自动排版函数
 * 根据图片和文字内容，自动计算最佳布局位置
 */
export function autoLayout(
  images: ImageFile[],
  texts: TextElement[],
  config: Partial<LayoutConfig> = {}
): { images: Array<{ id: string; x: number; y: number; scale?: number; rotation?: number }>; texts: Array<{ id: string; x: number; y: number }> } {
  const layoutConfig = { ...DEFAULT_LAYOUT_CONFIG, ...config };
  const { canvasWidth, canvasHeight, padding } = layoutConfig;

  const result: {
    images: Array<{ id: string; x: number; y: number; width?: number; height?: number }>;
    texts: Array<{ id: string; x: number; y: number }>;
  } = {
    images: [],
    texts: [],
  };

  // 限制每页最多2张图片
  const pageImages = images.slice(0, 2);
  
  if (pageImages.length === 0) {
    // 没有图片，只排版文字
    return layoutTextsOnly(texts, canvasWidth, canvasHeight, padding);
  }

  // 分离不同类型的文字
  const dateTexts = texts.filter(t => t.type === 'date');
  const titleTexts = texts.filter(t => t.type === 'title');
  const ingredientTexts = texts.filter(t => t.type === 'ingredients');
  const feelingTexts = texts.filter(t => t.type === 'feeling');
  const otherTexts = texts.filter(t => !['date', 'title', 'ingredients', 'feeling'].includes(t.type));

  // 计算图片总尺寸（估算）
  const imageAspectRatios = pageImages.map(img => img.width / img.height);
  const avgAspectRatio = imageAspectRatios.reduce((a, b) => a + b, 0) / imageAspectRatios.length;
  
  // 根据图片数量选择布局
  if (pageImages.length === 1) {
    // 单张图片：上下布局或左右布局
    const layout = singleImageLayout(
      pageImages[0],
      dateTexts,
      titleTexts,
      ingredientTexts,
      feelingTexts,
      otherTexts,
      canvasWidth,
      canvasHeight,
      padding,
      avgAspectRatio
    );
    result.images = layout.images;
    result.texts = layout.texts;
  } else if (pageImages.length === 2) {
    // 两张图片：左右布局或上下布局
    const layout = doubleImageLayout(
      pageImages,
      dateTexts,
      titleTexts,
      ingredientTexts,
      feelingTexts,
      otherTexts,
      canvasWidth,
      canvasHeight,
      padding,
      imageAspectRatios
    );
    result.images = layout.images;
    result.texts = layout.texts;
  }

  return result;
}

/**
 * 单张图片布局
 */
function singleImageLayout(
  image: ImageFile,
  dateTexts: TextElement[],
  titleTexts: TextElement[],
  ingredientTexts: TextElement[],
  feelingTexts: TextElement[],
  otherTexts: TextElement[],
  canvasWidth: number,
  canvasHeight: number,
  padding: number,
  aspectRatio: number
) {
  const result: {
    images: Array<{ id: string; x: number; y: number; width?: number; height?: number }>;
    texts: Array<{ id: string; x: number; y: number }>;
  } = {
    images: [],
    texts: [],
  };

  // 决定使用上下布局还是左右布局
  // 如果图片较宽（横向），使用上下布局；如果图片较高（纵向），使用左右布局
  const useVerticalLayout = aspectRatio > 1.2; // 横向图片

  if (useVerticalLayout) {
    // 上下布局：图片在上，文字在下
    const imageHeight = Math.min((canvasHeight - padding * 3) * 0.6, image.height);
    const imageWidth = imageHeight * aspectRatio;
    const imageX = (canvasWidth - imageWidth) / 2;
    const imageY = padding + 60; // 顶部留空间给日期

    result.images.push({
      id: image.id,
      x: imageX,
      y: imageY,
      scale: imageWidth / image.width,
      rotation: 0,
    });

    // 日期在右上角
    if (dateTexts.length > 0) {
      result.texts.push({
        id: dateTexts[0].id,
        x: canvasWidth - padding - 150,
        y: padding + 20,
      });
    }

    // 标题在图片下方居中
    let currentY = imageY + imageHeight + padding;
    if (titleTexts.length > 0) {
      result.texts.push({
        id: titleTexts[0].id,
        x: (canvasWidth - 200) / 2,
        y: currentY,
      });
      currentY += 40;
    }

    // 食材列表在标题下方
    if (ingredientTexts.length > 0) {
      result.texts.push({
        id: ingredientTexts[0].id,
        x: padding + 20,
        y: currentY,
      });
      currentY += 150;
    }

    // 吃后感在底部
    if (feelingTexts.length > 0) {
      result.texts.push({
        id: feelingTexts[0].id,
        x: (canvasWidth - 300) / 2,
        y: canvasHeight - padding - 60,
      });
    }
  } else {
    // 左右布局：图片在左，文字在右
    const imageWidth = Math.min((canvasWidth - padding * 3) * 0.55, image.width);
    const imageHeight = imageWidth / aspectRatio;
    const imageX = padding;
    const imageY = (canvasHeight - imageHeight) / 2;

    result.images.push({
      id: image.id,
      x: imageX,
      y: imageY,
      scale: imageWidth / image.width,
      rotation: 0,
    });

    // 日期在右上角
    if (dateTexts.length > 0) {
      result.texts.push({
        id: dateTexts[0].id,
        x: canvasWidth - padding - 150,
        y: padding + 20,
      });
    }

    // 文字区域在右侧
    const textAreaX = imageX + imageWidth + padding * 2;
    const textAreaWidth = canvasWidth - textAreaX - padding;
    let currentY = imageY + 40;

    // 标题
    if (titleTexts.length > 0) {
      result.texts.push({
        id: titleTexts[0].id,
        x: textAreaX,
        y: currentY,
      });
      currentY += 50;
    }

    // 食材列表
    if (ingredientTexts.length > 0) {
      result.texts.push({
        id: ingredientTexts[0].id,
        x: textAreaX,
        y: currentY,
      });
      currentY += 180;
    }

    // 吃后感在图片下方或右侧底部
    if (feelingTexts.length > 0) {
      result.texts.push({
        id: feelingTexts[0].id,
        x: textAreaX,
        y: Math.min(currentY, imageY + imageHeight - 40),
      });
    }
  }

  // 其他文字随机放置
  otherTexts.forEach((text, index) => {
    result.texts.push({
      id: text.id,
      x: padding + index * 100,
      y: padding + 100 + index * 50,
    });
  });

  return result;
}

/**
 * 两张图片布局
 */
function doubleImageLayout(
  images: ImageFile[],
  dateTexts: TextElement[],
  titleTexts: TextElement[],
  ingredientTexts: TextElement[],
  feelingTexts: TextElement[],
  otherTexts: TextElement[],
  canvasWidth: number,
  canvasHeight: number,
  padding: number,
  aspectRatios: number[]
) {
  const result: {
    images: Array<{ id: string; x: number; y: number; width?: number; height?: number }>;
    texts: Array<{ id: string; x: number; y: number }>;
  } = {
    images: [],
    texts: [],
  };

  // 使用左右布局：两张图片并排
  const imageAreaWidth = canvasWidth - padding * 2;
  const imageWidth = (imageAreaWidth - padding) / 2;
  const avgAspectRatio = aspectRatios.reduce((a, b) => a + b, 0) / aspectRatios.length;
  const imageHeight = Math.min(imageWidth / avgAspectRatio, (canvasHeight - padding * 3) * 0.5);

  // 第一张图片在左侧
  result.images.push({
    id: images[0].id,
    x: padding,
    y: padding + 60,
    width: imageWidth,
    height: imageHeight,
  });

  // 第二张图片在右侧
  result.images.push({
    id: images[1].id,
    x: padding + imageWidth + padding,
    y: padding + 60,
    width: imageWidth,
    height: imageHeight,
  });

  // 日期在右上角
  if (dateTexts.length > 0) {
    result.texts.push({
      id: dateTexts[0].id,
      x: canvasWidth - padding - 150,
      y: padding + 20,
    });
  }

  // 标题在图片上方居中
  if (titleTexts.length > 0) {
    result.texts.push({
      id: titleTexts[0].id,
      x: (canvasWidth - 200) / 2,
      y: padding + 20,
    });
  }

  // 食材列表紧邻第一张图片（左侧图片下方）
  if (ingredientTexts.length > 0) {
    result.texts.push({
      id: ingredientTexts[0].id,
      x: padding + 20,
      y: padding + 60 + imageHeight + padding,
    });
  }

  // 吃后感在第二张图片下方或右下角
  if (feelingTexts.length > 0) {
    result.texts.push({
      id: feelingTexts[0].id,
      x: canvasWidth - padding - 250,
      y: padding + 60 + imageHeight + padding,
    });
  }

  // 其他文字
  otherTexts.forEach((text, index) => {
    result.texts.push({
      id: text.id,
      x: padding + index * 100,
      y: canvasHeight - padding - 100 - index * 50,
    });
  });

  return result;
}

/**
 * 仅文字布局（无图片时）
 */
function layoutTextsOnly(
  texts: TextElement[],
  canvasWidth: number,
  canvasHeight: number,
  padding: number
) {
  const result: {
    images: Array<{ id: string; x: number; y: number; width?: number; height?: number }>;
    texts: Array<{ id: string; x: number; y: number }>;
  } = {
    images: [],
    texts: [],
  };

  const dateTexts = texts.filter(t => t.type === 'date');
  const titleTexts = texts.filter(t => t.type === 'title');
  const ingredientTexts = texts.filter(t => t.type === 'ingredients');
  const feelingTexts = texts.filter(t => t.type === 'feeling');
  const otherTexts = texts.filter(t => !['date', 'title', 'ingredients', 'feeling'].includes(t.type));

  let currentY = padding + 40;

  // 日期在右上角
  if (dateTexts.length > 0) {
    result.texts.push({
      id: dateTexts[0].id,
      x: canvasWidth - padding - 150,
      y: padding + 20,
    });
  }

  // 标题在顶部居中
  if (titleTexts.length > 0) {
    result.texts.push({
      id: titleTexts[0].id,
      x: (canvasWidth - 200) / 2,
      y: currentY,
    });
    currentY += 60;
  }

  // 食材列表
  if (ingredientTexts.length > 0) {
    result.texts.push({
      id: ingredientTexts[0].id,
      x: padding + 20,
      y: currentY,
    });
    currentY += 200;
  }

  // 吃后感
  if (feelingTexts.length > 0) {
    result.texts.push({
      id: feelingTexts[0].id,
      x: (canvasWidth - 300) / 2,
      y: currentY,
    });
  }

  // 其他文字
  otherTexts.forEach((text, index) => {
    result.texts.push({
      id: text.id,
      x: padding + 20,
      y: currentY + 100 + index * 50,
    });
  });

  return result;
}
