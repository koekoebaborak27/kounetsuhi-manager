// S01 ログインの画面。水彩風の背景画像の上に、ロゴと「Google でログイン」ボタンを重ねる（DESIGN.md「3. 画面の骨組み」）。
import Image from "next/image";
import { LoginButton } from "./login-button";

// ログインに失敗して戻ってきたときに表示する文言（設計書 S01 の「エラー時の表示文言」）。
export const LOGIN_ERROR_MESSAGE =
  "ログインできませんでした。家族として登録済みの Google アカウントか確認して、もう一度お試しください。";

// ログインの画面。hasError が true のときは、ボタンの上にエラーの文言を出す。
export function LoginScreen({ hasError }: { hasError: boolean }) {
  return (
    <main className="relative isolate flex h-dvh flex-col items-center justify-center gap-8 overflow-hidden px-4">
      {/* 背景の画像。スマホと PC で縦横の比率が違う画像を使い分ける。飾りなので代わりの文字（alt）は空にする。 */}
      <Image
        src="/images/login-bg-mobile.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover lg:hidden"
      />
      <Image
        src="/images/login-bg-pc.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-20 hidden object-cover lg:block"
      />
      {/* 文字が読めるよう、画面の中央の帯だけ背景を暗くする。 */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-b from-transparent from-20% via-black/70 via-50% to-transparent to-80%"
      />
      <h1 className="w-11/12 max-w-80 lg:w-110 lg:max-w-4/5">
        <Image
          src="/images/login-logo.png"
          alt="光熱費マネージャー"
          width={880}
          height={320}
          priority
          className="h-auto w-full"
        />
      </h1>
      {hasError && (
        <p role="alert" className="max-w-sm rounded-md bg-card px-4 py-3 text-sm text-destructive">
          {LOGIN_ERROR_MESSAGE}
        </p>
      )}
      <LoginButton />
    </main>
  );
}
