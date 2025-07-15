import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/db';
import { z } from 'zod';

const patchSchema = z.record(z.string(), z.any());

export async function PATCH(
  req: NextRequest,
  { params }: { params: { lda_id: string } }
) {
  try {
    const ldaId = parseInt(params.lda_id);
    if (isNaN(ldaId)) {
      return NextResponse.json({ error: 'Invalid LDA ID' }, { status: 400 });
    }

    const body = await req.json();
    const validatedBody = patchSchema.parse(body);

    // Check if OrganisationOperations exists for this LDA
    const existingOperation = await prisma.organisationOperations.findUnique({
      where: { localDevelopmentAgencyId: ldaId },
    });
    
    let updatedOperation;
    
    if (existingOperation) {
      // Update existing record
      updatedOperation = await prisma.organisationOperations.update({
        where: { localDevelopmentAgencyId: ldaId },
        data: validatedBody,
      });
    } else {
      // Create new record
      updatedOperation = await prisma.organisationOperations.create({
        data: {
          ...validatedBody,
          localDevelopmentAgency: {
            connect: { id: ldaId }
          }
        },
      });
    }

    return NextResponse.json(updatedOperation, { status: 200 });
  } catch (error) {
    console.error('Error updating organisation operations:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
