import { PrismaClient } from '@prisma/client';
import { ZA_PROVINCES } from '../../constants/province';

const prisma = new PrismaClient();

/**
 * Seed script to populate provinces with districts stored as JSON
 */
async function main() {
  console.log('Starting province seeding...');

  // Clear existing data (optional - uncomment if needed)
  // await prisma.province.deleteMany();

  // Create provinces with districts as JSON
  for (const provinceData of ZA_PROVINCES) {
    console.log(`Creating province: ${provinceData.name} with ${provinceData.districts.length} districts`);
    
    // Create the province with districts as JSON
    await prisma.province.upsert({
      where: { code: provinceData.code },
      update: {
        name: provinceData.name,
        districts: provinceData.districts ? JSON.parse(JSON.stringify(provinceData.districts)) : [], // Store districts as JSON
      },
      create: {
        name: provinceData.name,
        code: provinceData.code,
        districts: provinceData.districts ? JSON.parse(JSON.stringify(provinceData.districts)) : [], // Store districts as JSON
      },
    });
  }

  console.log('Province seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding provinces:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
