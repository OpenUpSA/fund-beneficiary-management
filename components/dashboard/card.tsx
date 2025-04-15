export const DashboardCard = ({ title, amount, children }: { title: string, amount: number, children: React.ReactNode }) => {
  return (
    <div className="bg-gray-100a p-4 rounded-sm border">
      <p className="text-muted-foreground text-sm">{title}</p>
      <div className="flex justify-between items-center">
        <p className="text-2xl font-bold">R{amount.toLocaleString()}</p>
        {children}
      </div>
    </div>
  )
}