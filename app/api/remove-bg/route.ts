import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    await requireAuth();

    const requestFormData = await request.formData();
    const imageFile = requestFormData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json(
        { error: '未提供图片文件' },
        { status: 400 }
      );
    }

    const apiKey = process.env.REMOVE_BG_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: '未配置 Remove.bg API 密钥' },
        { status: 500 }
      );
    }

    // 将文件转换为Buffer
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 调用 Remove.bg API
    const formData = new FormData();
    formData.append('image_file', new Blob([buffer]), imageFile.name);
    formData.append('size', 'auto');

    const removeBgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
      },
      body: formData,
    });

    if (!removeBgResponse.ok) {
      let errorMessage = '抠图失败，请稍后重试';
      let canUseOriginal = false;
      
      try {
        const errorText = await removeBgResponse.text();
        console.error('Remove.bg API 错误:', errorText);
        
        // 尝试解析JSON错误
        try {
          const errorData = JSON.parse(errorText);
          
          // 解析具体的错误信息
          if (errorData.errors && Array.isArray(errorData.errors)) {
            const firstError = errorData.errors[0];
            
            if (firstError.code === 'unknown_foreground') {
              errorMessage = '无法识别图片前景，可能是背景与主体对比度不足。建议：使用原图继续，或尝试其他图片。';
              canUseOriginal = true;
            } else if (firstError.title) {
              errorMessage = firstError.title;
              // 如果是无法识别前景的错误，也标记可以使用原图
              if (firstError.code === 'unknown_foreground') {
                canUseOriginal = true;
              }
            }
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          // 如果不是JSON格式，使用原始错误文本
          if (errorText.includes('unknown_foreground') || errorText.includes('Could not identify')) {
            errorMessage = '无法识别图片前景，可能是背景与主体对比度不足。建议：使用原图继续，或尝试其他图片。';
            canUseOriginal = true;
          }
        }
      } catch (e) {
        console.error('读取错误响应失败:', e);
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          code: 'remove_bg_failed',
          canUseOriginal: canUseOriginal
        },
        { status: removeBgResponse.status }
      );
    }

    // 获取处理后的图片
    const processedImage = await removeBgResponse.arrayBuffer();
    const base64Image = Buffer.from(processedImage).toString('base64');
    const dataUrl = `data:image/png;base64,${base64Image}`;

    return NextResponse.json({
      success: true,
      image: dataUrl,
    });
  } catch (error) {
    console.error('抠图处理错误:', error);
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    );
  }
}

