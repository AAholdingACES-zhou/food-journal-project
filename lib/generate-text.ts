import { AIGeneratedContent } from '@/types';

/**
 * 客户端调用AI文字生成API的工具函数
 */
export async function generateText(ingredients?: string[]): Promise<AIGeneratedContent> {
  try {
    console.log('调用生成文字API，参数:', { ingredients });
    const response = await fetch('/api/generate-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ingredients }),
    });

    console.log('API响应状态:', response.status, response.statusText);

    if (!response.ok) {
      let errorMessage = '文字生成失败';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
        console.error('API返回错误:', error);
      } catch (e) {
        const errorText = await response.text();
        console.error('API返回错误（非JSON）:', errorText);
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('API返回数据:', data);
    
    return {
      date: data.date,
      title: data.title,
      feeling: data.feeling,
    };
  } catch (error) {
    console.error('generateText函数错误:', error);
    throw error;
  }
}

