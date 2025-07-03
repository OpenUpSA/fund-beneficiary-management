import { NextResponse } from 'next/server';
import prisma from "@/db"

/**
 * GET /api/provinces
 * Returns all provinces with their districts
 */
export async function GET() {

  try {
    const provinces = await prisma.province.findMany();
    return NextResponse.json(provinces)
  } catch (error) {
    console.error('Error fetching provinces:', error);
    return NextResponse.json(
      { error: 'Failed to fetch provinces' },
      { status: 500 }
    );
  }
}
