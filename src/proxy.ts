// 画面を開くたびに、ログイン状態と世帯への所属を確かめて、開いてよい画面へ振り分ける。
// Next.js 16 では、この役割のファイルを src/proxy.ts に置く（Node.js の上で動く）。
// 移すかどうかの判定は decideRedirect（modules/auth/route-guard.ts）に任せ、ここはリクエストとの受け渡しだけを行う。
import { NextResponse, type NextRequest } from "next/server";
import { decideRedirect, getCurrentUser } from "@/modules/auth";
import { hasMembership } from "@/modules/household";

// リクエストごとに呼ばれる。移す先があれば、その画面へ移す。
export async function proxy(request: NextRequest) {
  // クッキーからログイン中の人を取り出し、ログインしていれば世帯に所属しているかを DB で確かめる。
  const user = await getCurrentUser(request.headers);
  const hasHousehold = user ? await hasMembership(user.id) : false;

  const destination = decideRedirect({
    method: request.method,
    pathname: request.nextUrl.pathname,
    isLoggedIn: user !== null,
    hasHousehold,
  });
  if (destination === null) return NextResponse.next();
  return NextResponse.redirect(new URL(destination, request.url));
}

// 振り分けを行う URL。画面だけを対象にし、API（ログインの API を含む）・Next.js の内部のファイル・画像などは除く。
// API は画面ではないので振り分けず、それぞれの処理の中でログインを確かめる。
export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|images/|favicon.ico).*)"],
};
