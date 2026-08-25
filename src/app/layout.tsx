import type { Metadata, Viewport } from 'next'
import { Be_Vietnam_Pro } from 'next/font/google'
import type { ReactNode } from 'react'

import './globals.css'

// Be Vietnam Pro là bắt buộc, không phải sở thích: tên món tiếng Việt có dấu
// chồng (ế, ộ, ữ, ằ) mà nhiều font làm hỏng. Subset `vietnamese` là phần đắt
// giá nhất ở đây.
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-be-vietnam-pro',
  display: 'swap',
})

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
    <html lang="vi" className={beVietnamPro.variable}>
      <body className="min-h-dvh bg-surface font-sans text-ink antialiased">{children}</body>
    </html>
  )
}
