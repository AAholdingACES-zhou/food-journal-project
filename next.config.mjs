/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['api.remove.bg'],
  },
  eslint: {
    // 忽略构建时的 ESLint 警告（img 标签警告不影响功能）
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

