import Image from "next/image"
import { avatarUrl as imageUrl } from "@/lib/avatar"

export function LDALogo({ path, name }: { path?: string | null; name: string }) {
  const src = imageUrl(path)
  if (!src) return null

  return (
    <Image
      src={src}
      alt={`${name} logo`}
      width={64}
      height={64}
      unoptimized
      className="size-16 shrink-0 object-contain"
    />
  )
}
