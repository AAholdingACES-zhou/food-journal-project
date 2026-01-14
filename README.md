# 美食手帐网页 - Food Journal

一款基于Web的美食手帐生成工具，通过AI技术帮助用户将美食照片转换为精美的手绘风格手帐页面。

## 技术栈

- **框架**: Next.js 14+ (App Router)
- **认证**: NextAuth.js (邮箱魔法链接)
- **UI**: Tailwind CSS + shadcn/ui
- **状态管理**: Zustand
- **图片处理**: Canvas API / Fabric.js
- **AI服务**: DeepSeek (文字生成), Remove.bg (抠图)

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 环境变量

创建 `.env.local` 文件：

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# 邮箱配置 (用于魔法链接)
EMAIL_SERVER_HOST=smtp.example.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@example.com
EMAIL_SERVER_PASSWORD=your-password
EMAIL_FROM=your-email@example.com

# 白名单邮箱 (逗号分隔)
ALLOWED_EMAILS=user1@example.com,user2@example.com

# AI服务API密钥
REMOVE_BG_API_KEY=your-remove-bg-api-key
DEEPSEEK_API_KEY=your-deepseek-api-key
```

## 功能特性

- ✅ 邮箱魔法链接登录 + 白名单机制
- ✅ 图片上传与AI抠图
- ✅ 图片编辑（旋转、缩放、裁剪、擦除）
- ✅ 手绘风格边框
- ✅ 文字输入（食材列表、吃后感、日期、标题）
- ✅ AI文字生成（标题、日期、吃后感）
- ✅ 自动排版与手动调整
- ✅ 多页手帐生成
- ✅ 导出PNG/PDF

## 项目结构

```
food-journal-project/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # 根布局
│   ├── page.tsx            # 首页
│   ├── login/              # 登录页
│   ├── upload/             # 上传页
│   ├── edit/               # 编辑页
│   └── api/                # API Routes
├── components/             # React组件
├── lib/                    # 工具函数
├── store/                  # Zustand状态管理
└── types/                  # TypeScript类型定义
```

