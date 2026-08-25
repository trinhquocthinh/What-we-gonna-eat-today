import type { ReactElement } from 'react'

import { Banner } from '@/shared/ui/banner'

import { SsoSubmitButton } from './sso-submit-button'

export type LoginScreenProps = {
  hasError: boolean
  /** Server Action. Component này nằm ở `components/` nên không được tự gọi
   *  use case — nó chỉ nhận hành động qua props. */
  signInAction: () => Promise<void>
}

/**
 * S-01 Đăng nhập. Giá trị lấy từ `docs/designs/designs/S-01 S-02 S-03 S-13 Khung
 * vao app.dc.html` dòng 35–51 — màu, cỡ chữ, khoảng cách và copy tiếng Việt đều
 * là giá trị cuối, không phải gợi ý.
 *
 * Thao tác chính nằm ở nửa dưới màn hình (NFR-03).
 */
export function LoginScreen({ hasError, signInAction }: LoginScreenProps): ReactElement {
  return (
    <main className="flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-app flex-1 flex-col justify-center gap-4 px-6 pt-8">
        <span className="text-caption font-medium uppercase tracking-eyebrow text-accent">
          Bữa cơm nhà
        </span>
        <h1 className="text-pretty text-hero font-bold text-ink">Hôm nay nhà mình ăn gì</h1>
        <p className="text-pretty text-body-lg font-normal text-ink-muted">
          Cả nhà vuốt qua vài món trong 30 giây. Người nấu chốt. Xong.
        </p>
      </div>

      <div className="mx-auto flex w-full max-w-app flex-col gap-3 px-6 pb-8 pt-8">
        {hasError ? <Banner tone="danger">Không đăng nhập được. Thử lại giúp mình.</Banner> : null}

        <form action={signInAction}>
          <SsoSubmitButton />
        </form>

        <span className="self-center text-pretty text-center text-caption font-medium text-ink-muted">
          Chỉ dùng để nhận diện bạn trong nhóm gia đình
        </span>
      </div>
    </main>
  )
}
