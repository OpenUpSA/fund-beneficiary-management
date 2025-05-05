import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  LeafIcon,
  PauseIcon,
  PersonStandingIcon,
  PlaneIcon,
  PlayIcon,
  ScanSearchIcon,
  ThermometerIcon,
  TriangleAlertIcon,
  TrophyIcon,
  UtensilsIcon,
  XIcon,
} from "lucide-react"

const iconMap = {
  Calendar: CalendarIcon,
  Check: CheckIcon,
  Clock: ClockIcon,
  Leaf: LeafIcon,
  Pause: PauseIcon,
  PersonStanding: PersonStandingIcon,
  Plane: PlaneIcon,
  Play: PlayIcon,
  ScanSearch: ScanSearchIcon,
  Thermometer: ThermometerIcon,
  TriangleAlert: TriangleAlertIcon,
  Triophy: TrophyIcon,
  Utensils: UtensilsIcon,
  X: XIcon
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

