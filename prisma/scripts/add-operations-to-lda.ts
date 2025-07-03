import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find all LDAs where operations is null
  const ldasWithoutOps = await prisma.localDevelopmentAgency.findMany({
    where: { operations: null },
    select: { id: true },
  });

  let count = 0;
  for (const lda of ldasWithoutOps) {
    await prisma.organisationOperations.create({
      data: {
        localDevelopmentAgencyId: lda.id,
      },
    });
    count++;
  }

  console.log(`Added operations to ${count} LDA(s)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
