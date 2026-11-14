import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const trskpdCount = await prisma.trskpd.count();
  const trdrkaCount = await prisma.trdrka.count();
  const trdpoCount = await prisma.trdpo.count();

  console.log('Current DB Counts:');
  console.log('- trskpd:', trskpdCount);
  console.log('- trdrka:', trdrkaCount);
  console.log('- trdpo:', trdpoCount);

  if (trskpdCount > 0) {
    const years = await prisma.trskpd.groupBy({
      by: ['tahunAnggaran'],
      _count: true
    });
    console.log('trskpd by year:', years);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

