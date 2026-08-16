import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

import './globals.css'

export const metadata: Metadata = {
  title: 'Hôm nay ăn gì',
  description: 'Chốt bữa cho cả nhà mà không phải hỏi vòng quanh',
}

// Thiết bị chính là điện thoại (Design Criteria). Khoá zoom là chống tiếp cận,
// nên chỉ đặt viewport-fit, không đặt maximumScale.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  )
}
