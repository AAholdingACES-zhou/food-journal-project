/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['api.remove.bg'],
  },
  eslint: {
    // 忽略构建时的 ESLint 警告（img 标签警告不影响功能）
    ignoreDuringBuilds: true,
  },
  // 禁用静态页面生成，确保所有页面都是动态的
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;

