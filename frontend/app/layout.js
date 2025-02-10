import './globals.css'
import { Providers } from './providers'

export const metadata = {
  title: 'Mine BOHR',
  description: 'Do the work. Earn BOHR.',
  // You can add more metadata properties:
  openGraph: {
    title: 'Mine BOHR',
    description: 'Do the work. Earn BOHR.',
    siteName: 'BOHRIUM',
  },
  robots: {
    index: true,
    follow: true,
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}