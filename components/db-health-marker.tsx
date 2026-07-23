import { unstable_noStore as noStore } from "next/cache"
import prisma from "@/db"

// UptimeRobot keyword-matches the raw HTML for "DB_UP" — keep the marker
// strings stable, monitors are configured against them.
const DB_CHECK_TIMEOUT_MS = 5000

async function isDatabaseUp(): Promise<boolean> {
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("DB health check timed out")), DB_CHECK_TIMEOUT_MS)
      ),
    ])
    return true
  } catch {
    return false
  }
}

export async function DbHealthMarker() {
  noStore()
  const up = await isDatabaseUp()
  return (
    <div
      hidden
      dangerouslySetInnerHTML={{ __html: up ? "<!-- DB_UP -->" : "<!-- DB_DOWN -->" }}
    />
  )
}
