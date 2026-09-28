import { LoginScreen } from "@/modules/auth";

// S01 ログインの画面。
// ログインに失敗して戻ってきたときは、URL に ?error=... が付いているので、そのときだけエラーを表示する。
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <LoginScreen hasError={error !== undefined} />;
}
