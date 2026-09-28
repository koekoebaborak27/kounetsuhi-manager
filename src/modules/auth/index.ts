// 認証の機能の公開 API。ほかの機能や画面（src/app）からは、ここに書いたものだけを使う。
export { auth } from "./auth";
export { getCurrentUser, requireUser } from "./service";
export { decideRedirect, HOME_PATH, LOGIN_PATH, SETUP_PATH } from "./route-guard";
export type { RouteGuardInput } from "./route-guard";
export type { CurrentUser } from "./types";
export { LoginScreen } from "./ui/login-screen";
export { LogoutButton } from "./ui/logout-button";
