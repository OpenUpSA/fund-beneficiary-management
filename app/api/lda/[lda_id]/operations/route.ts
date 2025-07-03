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

    const updatedOperation = await prisma.organisationOperations.update({
      where: { localDevelopmentAgencyId: ldaId },
      data: validatedBody,
    });

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
