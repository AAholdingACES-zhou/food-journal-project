const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  try {
    const now = new Date();
    const deleted = await prisma.verificationToken.deleteMany({
      where: {
        expires: {
          lt: now,
        },
      },
    });
    console.log(`清理了 ${deleted.count} 个过期的验证令牌`);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();

