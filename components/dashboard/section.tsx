import { DashboardCard } from "@/components/dashboard/card"
import { AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion"
import { LineChart, Line, ResponsiveContainer } from "recharts"

const data = [
  { value: 5 },
  { value: 10 },
  { value: 7 },
  { value: 14 },
  { value: 9 },
  { value: 18 },
]

export const DashboardSection = ({ name, title }: { name: string, title: string }) => {
  return (
    <AccordionItem value={name}>
      <AccordionTrigger>{title}</AccordionTrigger>
      <AccordionContent className="grid grid-cols-1 gap-4 sm:grid-cols-4 mt-2">
        <DashboardCard title="Total funding value" amount={21031309}>
          <div className="w-12 h-8">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#00f"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>
        <DashboardCard title="Total FRIS application value" amount={21031309}>
          <div className="w-12 h-8">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#00f"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>
        <DashboardCard title="Total DFT application value" amount={21031309}>
          57%
        </DashboardCard>
        <DashboardCard title="Current FRIS funding approved" amount={21031309}>
          3 app.
        </DashboardCard>
      </AccordionContent>
    </AccordionItem>
  )
}