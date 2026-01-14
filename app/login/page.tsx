'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  // 检查URL中的错误参数
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'Verification') {
      setError('验证链接已失效或已被使用，请重新发送登录链接');
    } else if (errorParam === 'Configuration') {
      setError('系统配置错误，请稍后重试');
    }
  }, [searchParams]);

  // 如果已经登录，跳转到上传页
  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/upload');
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess(false);

    try {
      const result = await signIn('email', {
        email,
        redirect: false,
      });

      if (result?.error) {
        // 根据错误类型显示不同的错误信息
        if (result.error === 'Configuration' || result.error.includes('nodemailer') || result.error.includes('createTransport')) {
          setError('邮件服务配置错误，请检查服务器日志');
        } else if (result.error === 'Verification') {
          setError('验证链接已失效，请重新发送登录链接');
        } else {
          setError('登录失败，请检查邮箱是否在白名单中');
        }
      } else {
        setSuccess(true);
        // 等待一下让用户看到成功消息
        setTimeout(() => {
          router.push('/upload');
        }, 2000);
      }
    } catch (err) {
      setError('发生错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary text-text-primary p-4">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-default bg-bg-card p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">美食手帐</h1>
          <p className="text-text-secondary">请输入您的邮箱登录</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2 text-text-primary">
              邮箱地址
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-default bg-bg-secondary px-4 py-3 text-text-primary placeholder-text-tertiary focus:border-focus focus:outline-none transition-all duration-normal"
              placeholder="your@email.com"
            />
            <p className="mt-2 text-xs text-text-tertiary">
              仅白名单邮箱可登录，请确认您的邮箱已添加到系统白名单
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-400 shadow-md">
              {error}
              {error.includes('验证链接') && (
                <p className="mt-2 text-xs text-text-tertiary">
                  提示：如果验证链接失效，请重新点击"发送登录链接"按钮
                </p>
              )}
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-500/10 border border-green-500/30 p-4 text-sm text-green-400 shadow-md">
              登录链接已发送到您的邮箱，请查收！
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !email}
            className="w-full rounded-md bg-accent-primary text-black px-4 py-3 font-medium hover:bg-accent-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-normal shadow-md hover:shadow-lg"
          >
            {isLoading ? '发送中...' : '发送登录链接'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-bg-primary text-text-primary">
        <p>加载中...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

