export const metadata = { title: 'Finnisher' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'Roboto, sans-serif', background: '#f5f5f5' }}>
        {children}
      </body>
    </html>
  )
}
