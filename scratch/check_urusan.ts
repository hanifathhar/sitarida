import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const urusans = await prisma.msUrusan.findMany();
  console.log('Total Urusan in DB:', urusans.length);
  if (urusans.length > 0) {
    console.log('Sample Urusan:', urusans.slice(0, 3));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
