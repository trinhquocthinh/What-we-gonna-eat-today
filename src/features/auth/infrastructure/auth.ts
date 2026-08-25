import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

import { provisionUser } from '../application/provision-user'
import { drizzleUserRepository } from './drizzle-user-repository'

/**
 * Tech Spec §5 — Auth.js, một nhà cung cấp duy nhất, session là cookie JWT hạn
 * 30 ngày.
 *
 * Không dùng adapter database: schema `users` của dự án lấy khoá định danh là
 * `provider + provider_subject` (SPEC-001), không khớp bộ bảng mà adapter của
 * Auth.js yêu cầu. Việc tìm-hoặc-tạo User nằm ở `application/provisionUser`.
 *
 * Hiện là Google. Đích đến là Authentik của Family Hub — app này là một service
 * trong hub, và danh tính dùng chung đến từ đó. Việc chuyển chỉ đụng dòng
 * `providers` bên dưới và `signIn(...)` trong presentation/containers/
 * auth-actions.ts; tầng domain và application không biết nhà cung cấp là ai nên
 * không phải sửa gì. Các bước dựng Authentik nằm ở Setup & Ops Guide §3.1.
 */
declare module '@auth/core/types' {
  interface Session {
    userId?: string
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    userId?: string
  }
}

const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Truyền chính hàm provider, không gọi nó: @auth/core cần điều đó để tự đọc
  // AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET từ môi trường.
  providers: [Google],

  session: { strategy: 'jwt', maxAge: THIRTY_DAYS_IN_SECONDS },

  // Cho phép chạy trên domain động của Vercel Preview
  trustHost: true,

  // S-01 vừa là trang đăng nhập vừa là nơi hiện lỗi xác thực.
  pages: { signIn: '/', error: '/' },

  callbacks: {
    async jwt({ token, account, profile }) {
      // `account` chỉ khác null ở đúng lượt callback OAuth. Mọi request thường
      // đi qua đây mà không chạm database.
      if (account === null || account === undefined) {
        return token
      }

      const result = await provisionUser(
        { users: drizzleUserRepository },
        {
          provider: account.provider,
          // providerAccountId chính là `sub` của Google. KHÔNG dùng `user.id`:
          // @auth/core sinh nó bằng crypto.randomUUID() và nó vô nghĩa.
          providerSubject: account.providerAccountId,
          email: profile?.email ?? null,
          displayName: profile?.name ?? null,
        },
      )

      // Phải THROW, không được `return null`. @auth/core hiểu `null` là "xoá
      // cookie rồi vẫn redirect về callbackUrl" — người dùng rơi vào vòng lặp
      // đăng nhập mà không thấy lỗi nào. Đây là chỗ DUY NHẤT trong codebase
      // biến một `Failure` thành exception, và nó nằm ở ranh giới khung ngoài
      // chứ không phải ranh giới tầng: `application/` vẫn trả `Result`.
      if (!result.ok) {
        throw new Error(`SPEC-001 provisionUser thất bại: ${result.error.code}`)
      }

      token.userId = result.value.id
      token.name = result.value.displayName
      token.email = result.value.email

      return token
    },

    session({ session, token }) {
      if (typeof token.userId === 'string') {
        session.userId = token.userId
      }
      return session
    },
  },
})
