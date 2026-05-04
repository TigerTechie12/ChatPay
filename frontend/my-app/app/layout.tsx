import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "ChatPay",
  description: "Payments built for everyone",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
