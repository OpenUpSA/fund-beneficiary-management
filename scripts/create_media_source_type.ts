import prisma from "@/db"

/**
 * Script to create media source types in the database
 * This adds three types: Narrative report, Field report, and Uploaded
 */
async function createMediaSourceTypes() {
  try {
    console.log('Creating media source types...');
    
    // Define the media source types to create
    const mediaSourceTypes = [
      { title: 'Narrative report' },
      { title: 'Field report' },
      { title: 'Uploaded' },
    ];
    
    // Create or update each media source type
    for (const type of mediaSourceTypes) {
      // Check if the media source type already exists
      const existingType = await prisma.mediaSourceType.findFirst({
        where: {
          title: type.title
        }
      });
      
      let result;
      
      if (existingType) {
        // Update existing type if needed
        result = existingType;
        console.log(`Media source type already exists: ${result.title} (ID: ${result.id})`);
      } else {
        // Create new type
        result = await prisma.mediaSourceType.create({
          data: {
            title: type.title
          }
        });
        console.log(`Created new media source type: ${result.title} (ID: ${result.id})`);
      }
    }
    
    console.log('Media source types created successfully!');
  } catch (error) {
    console.error('Error creating media source types:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
createMediaSourceTypes();