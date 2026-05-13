import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FOFA Training Portal',
  description: 'Faculty of Fine Arts - New Capital University',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        {/* --- HEADER --- */}
        <div className="header">
          <h1>Faculty of Fine Arts</h1>
          <span>New Capital University · FOFA Training Portal</span>
        </div>
        
        {/* --- MAIN CONTENT CONTAINER --- */}
        <main className="flex-1">
          {children}
        </main>
        
        {/* --- FOOTER --- */}
        <div className="footer">
          ©️ Faculty of Fine Arts – New Capital University (FOFA)
        </div>
      </body>
    </html>
  )
}