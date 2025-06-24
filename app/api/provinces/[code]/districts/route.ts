import { NextResponse } from 'next/server';
import { getDistrictsByProvinceCode } from '@/lib/provinces';

/**
 * GET /api/provinces/[code]/districts
 * Returns districts for a specific province by province code
 */
export async function GET(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    
    if (!code) {
      return NextResponse.json(
        { error: 'Province code is required' },
        { status: 400 }
      );
    }

    const districts = await getDistrictsByProvinceCode(code);
    
    return NextResponse.json(districts);
  } catch (error) {
    console.error(`Error fetching districts:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch districts' },
      { status: 500 }
    );
  }
}
