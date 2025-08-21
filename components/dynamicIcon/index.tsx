import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  CloudIcon,
  GraduationCapIcon,
  LeafIcon,
  PauseIcon,
  PersonStandingIcon,
  PlaneIcon,
  PlayIcon,
  ScanSearchIcon,
  ScaleIcon,
  ThermometerIcon,
  TriangleAlertIcon,
  TrophyIcon,
  UsersIcon,
  UtensilsIcon,
  WheatIcon,
  XIcon,
} from "lucide-react"

const iconMap = {
  Calendar: CalendarIcon,
  Check: CheckIcon,
  Clock: ClockIcon,
  Cloud: CloudIcon,
  GraduationCap: GraduationCapIcon,
  Leaf: LeafIcon,
  Pause: PauseIcon,
  PersonStanding: PersonStandingIcon,
  Plane: PlaneIcon,
  Play: PlayIcon,
  ScanSearch: ScanSearchIcon,
  Scale: ScaleIcon,
  Thermometer: ThermometerIcon,
  TriangleAlert: TriangleAlertIcon,
  Triophy: TrophyIcon,
  Users: UsersIcon,
  Utensils: UtensilsIcon,
  Wheat: WheatIcon,
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

