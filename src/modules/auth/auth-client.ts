// ブラウザ側からログインの API を呼ぶための道具。
// ログインボタンのように、ブラウザで動く画面の部品から使う。
import { createAuthClient } from "better-auth/react";

// ブラウザ側で使う Better Auth のクライアント。接続先は同じサイトの /api/auth。
export const authClient = createAuthClient();
