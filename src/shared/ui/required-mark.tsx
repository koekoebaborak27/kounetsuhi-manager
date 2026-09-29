// 必須項目のラベルの後ろに付ける「*」。赤の太字で少し大きくし、必須の項目だと一目で分かるようにする。
// 読み上げでは「*」ではなく「必須」と伝わるよう、読み上げ用の文言を別に持つ。
export function RequiredMark() {
  return (
    <>
      <span aria-hidden className="ml-0.5 text-base leading-none font-bold text-destructive">
        *
      </span>
      <span className="sr-only">（必須）</span>
    </>
  );
}
