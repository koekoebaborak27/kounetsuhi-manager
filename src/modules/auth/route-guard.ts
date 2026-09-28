// 画面を開いたときに、ログイン状態と世帯への所属から、別の画面へ移すかどうかを決める。
// リクエストの型を使わない純粋な関数にして、すべての場合をテストで確かめられるようにしている。
// 表のもとは設計書 00_全体共通.md の「画面の振り分け」。

// ログイン画面（S01）の URL。
export const LOGIN_PATH = "/login";
// 初回設定の画面（S02）の URL。
export const SETUP_PATH = "/setup";
// ホームの画面（S03）の URL。
export const HOME_PATH = "/";

// 振り分けの判定に使う情報。
export type RouteGuardInput = {
  // リクエストの種類（GET・POST など）。
  method: string;
  // 開こうとした画面の URL のパス部分（例: /settings）。
  pathname: string;
  // ログインしているかどうか。
  isLoggedIn: boolean;
  // 世帯に所属しているかどうか。ログインしていないときは false。
  hasHousehold: boolean;
};

// 移す先の URL を返す。移さなくてよいときは null を返す。
export function decideRedirect(input: RouteGuardInput): string | null {
  const { method, pathname, isLoggedIn, hasHousehold } = input;
  // 画面の表示（GET・HEAD）以外は移さない。画面操作（Server Action）の POST を移すと、
  // POST が移した先へ送り直され、行き来が止まらなくなるため（src/AGENTS.md）。
  // 画面操作では、それぞれの処理の中でログインと所属を確かめる。
  if (method !== "GET" && method !== "HEAD") return null;
  // ログインしていない人は、ログイン画面以外を開けない。
  if (!isLoggedIn) return pathname === LOGIN_PATH ? null : LOGIN_PATH;
  // 世帯に入っていない人は、初回設定の画面以外を開けない。
  if (!hasHousehold) return pathname === SETUP_PATH ? null : SETUP_PATH;
  // 世帯に入っている人がログイン画面や初回設定の画面を開いたら、ホームへ移す。
  if (pathname === LOGIN_PATH || pathname === SETUP_PATH) return HOME_PATH;
  return null;
}
