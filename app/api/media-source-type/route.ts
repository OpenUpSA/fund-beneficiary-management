import { NextResponse } from "next/server";
import prisma from "@/db";

export async function GET() {
  try {
    const mediaSourceTypes = await prisma.mediaSourceType.findMany({
      orderBy: {
        title: "asc",
      },
    });

    return NextResponse.json(mediaSourceTypes);
  } catch (error) {
    console.error("Error fetching media source types:", error);
    return NextResponse.json(
      { error: "Failed to fetch media source types" },
      { status: 500 }
    );
  }
}
