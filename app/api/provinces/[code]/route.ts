import { NextResponse } from 'next/server';
import { getProvinceByCode } from '@/lib/provinces';

/**
 * GET /api/provinces/[code]
 * Returns a specific province with its districts by province code
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

    const province = await getProvinceByCode(code);
    
    if (!province) {
      return NextResponse.json(
        { error: 'Province not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(province);
  } catch (error) {
    console.error(`Error fetching province:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch province' },
      { status: 500 }
    );
  }
}
