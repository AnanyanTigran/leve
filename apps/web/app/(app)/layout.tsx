export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen max-w-[390px] mx-auto relative">
      {children}
    </div>
  )
}
