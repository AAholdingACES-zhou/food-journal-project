/**
 * 客户端调用Remove.bg API的工具函数
 */
export async function removeBackground(imageFile: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', imageFile);

  const response = await fetch('/api/remove-bg', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    // 创建一个包含完整错误信息的Error对象
    const errorObj = new Error(error.error || '抠图失败');
    // 将额外信息附加到错误对象上
    (errorObj as any).canUseOriginal = error.canUseOriginal;
    (errorObj as any).code = error.code;
    // 将错误信息序列化为JSON字符串，方便前端解析
    (errorObj as any).errorData = JSON.stringify(error);
    throw errorObj;
  }

  const data = await response.json();
  return data.image; // 返回base64格式的图片
}

