import { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

// 白名单邮箱列表（从环境变量读取）
const getAllowedEmails = (): string[] => {
  const emails = process.env.ALLOWED_EMAILS;
  if (!emails) return [];
  return emails.split(',').map(email => email.trim());
};

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT) || 587,
        secure: false, // 587端口使用TLS，不是SSL
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
        tls: {
          // 允许自签名证书（QQ邮箱可能需要）
          rejectUnauthorized: false,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ user, email }: { user: any; email?: any }) {
      // 在signIn回调中再次验证白名单
      if (!user.email) return false;
      
      const allowedEmails = getAllowedEmails();
      
      // 如果白名单为空，允许所有邮箱
      if (allowedEmails.length === 0) return true;
      
      // 不区分大小写比较
      const emailLower = user.email.toLowerCase();
      const isAllowed = allowedEmails.some(allowed => allowed.toLowerCase() === emailLower);
      
      if (isAllowed) {
        console.log('User sign in allowed:', user.email);
        return true;
      }
      
      console.log('User sign in denied (not in whitelist):', user.email);
      return false;
    },
    async jwt({ token, user }) {
      // 将用户信息添加到JWT token中
      if (user) {
        token.email = user.email;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // 将JWT token中的信息添加到session中
      if (session.user) {
        session.user.email = token.email as string;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24小时
  },
  secret: process.env.NEXTAUTH_SECRET,
};
