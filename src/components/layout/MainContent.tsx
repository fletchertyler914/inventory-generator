import { ReactNode } from "react"

interface MainContentProps {
  children: ReactNode
}

export function MainContent({ children }: MainContentProps) {
  return (
    <main className="container mx-auto px-8 py-10 max-w-[1800px]">
      {children}
    </main>
  )
}
