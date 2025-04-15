import { PersonStandingIcon, ThermometerIcon, UtensilsIcon, ScanSearchIcon, TrophyIcon, LeafIcon, PlaneIcon } from "lucide-react"

const iconMap = {
  Thermometer: ThermometerIcon,
  PersonStanding: PersonStandingIcon,
  Utensils: UtensilsIcon,
  Trophy: TrophyIcon,
  Leaf: LeafIcon,
  Transport: PlaneIcon

} as const

// Usage example:
// <DynamicIcon name="Thermometer" size={10} />
export const DynamicIcon = ({
  name,
  size = 24,
  className = "mr-1",
}: {
  name: string
  size?: number
  className?: string
}) => {
  const LucideIcon = iconMap[name as keyof typeof iconMap] ?? ScanSearchIcon

  return <LucideIcon size={size} className={className} />
}

