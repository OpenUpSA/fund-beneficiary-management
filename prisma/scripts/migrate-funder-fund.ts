import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const funds = await prisma.fund.findMany({
    select: {
      id: true,
      funderId: true,
    },
  });

  for (const fund of funds) {
    if (fund.funderId) {
      await prisma.fund.update({
        where: { id: fund.id },
        data: {
          funders: {
            connect: { id: fund.funderId },
          },
        },
      });
    }
  }

  console.log('Migrated funderId → funders (M2M)');
}

main()
  .catch((e) => {
    console.error('Migration failed', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
