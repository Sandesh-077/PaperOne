import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Focus Timer',
}

export default function TimerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  )
}
