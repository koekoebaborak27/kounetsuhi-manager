// ホーム画面に追加するための情報（アプリ名・アイコン・起動時の見た目）。Next.js が /manifest.webmanifest として配る。
// オフライン動作と通知は要件で対応しないため、Service Worker は置かない。
import type { MetadataRoute } from "next";

// アプリ名・アイコン・開く画面・色を返す。
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "光熱費マネージャー",
    short_name: "光熱費",
    description: "電気・ガス・水道の請求額と使用量を記録して比べるための家族向けアプリ",
    lang: "ja",
    // 追加したアイコンから開いたときは、ホーム画面（/）を開く。未ログインならログイン画面へ移る。
    start_url: "/",
    scope: "/",
    // ブラウザの枠を出さず、アプリのように全画面で開く。
    display: "standalone",
    // 起動中の画面の背景色とアドレスバー相当の色。globals.css の --background・--primary と合わせる。
    background_color: "#ffffff",
    theme_color: "#1a5fd0",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // 丸や角丸に切り抜かれても文字が欠けないよう、余白を多めに取った画像。
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
