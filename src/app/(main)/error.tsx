"use client";
// タブのある画面で、表示に必要なデータを読み込めなかったときに、中身の代わりに出す画面。
// Next.js は画面の読み込み中にエラーが起きると、同じ階層のこのファイルを表示する。タブは残るので、ほかの画面へは移れる。

// 読み込めなかったときの文言（設計書 00_全体共通.md の「共通のエラー表示」）。
const LOAD_ERROR_MESSAGE =
  "読み込めませんでした。通信状態を確認して、画面を再読み込みしてください。";

// 読み込めなかったときの画面。
export default function MainError() {
  return (
    <main className="px-4 py-4 lg:px-7">
      <p role="alert" className="text-sm">
        {LOAD_ERROR_MESSAGE}
      </p>
    </main>
  );
}
