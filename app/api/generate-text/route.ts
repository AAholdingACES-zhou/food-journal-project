import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

interface GenerateTextRequest {
  ingredients?: string[]; // 用户输入的食材列表（可选，用于生成标题参考）
}

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    try {
      await requireAuth();
    } catch (authError) {
      console.error('身份验证失败:', authError);
      return NextResponse.json(
        { error: '未授权，请先登录' },
        { status: 401 }
      );
    }

    const body: GenerateTextRequest = await request.json();
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: '未配置 DeepSeek API 密钥' },
        { status: 500 }
      );
    }

    // 获取当前日期
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

    // 构建提示词
    let prompt = `请为美食手帐生成以下内容：
1. 标题：一个简洁有趣的美食名称（如果提供了食材列表，请基于食材生成合适的名称，但不要添加新食材）
2. 吃后感：一句话的品尝感受，要自然口语化，带情感色彩，可以是中文或中英文混合

要求：
- 标题要简洁有趣，符合手帐风格
- 吃后感要真实自然，像朋友间的分享
- 支持中英文混合
- 不要生成食材列表

`;

    if (body.ingredients && body.ingredients.length > 0) {
      prompt += `用户提供的食材：${body.ingredients.join('、')}\n`;
    }

    prompt += `\n请以JSON格式返回，格式如下：
{
  "title": "美食标题",
  "feeling": "一句话吃后感"
}`;

    // 调用 DeepSeek API
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API 错误:', errorText);
      return NextResponse.json(
        { error: '文字生成失败，请稍后重试' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    // 尝试解析JSON响应
    let generatedData;
    try {
      // 提取JSON部分（可能包含markdown代码块）
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      generatedData = JSON.parse(jsonStr);
    } catch (e) {
      // 如果解析失败，使用默认值
      console.error('解析AI响应失败:', e);
      generatedData = {
        title: '美食',
        feeling: '好吃！',
      };
    }

    return NextResponse.json({
      success: true,
      date: dateStr,
      title: generatedData.title || '美食',
      feeling: generatedData.feeling || '好吃！',
    });
  } catch (error) {
    console.error('文字生成错误:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器错误，请稍后重试';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

