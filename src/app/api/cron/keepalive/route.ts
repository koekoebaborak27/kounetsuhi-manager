// Vercel Cron が 1 日 1 回呼ぶ URL（/api/cron/keepalive）。DB へ軽い問い合わせを送り、Supabase 無料プランの一時停止を防ぐ。
// Cron は「Authorization: Bearer <CRON_SECRET>」を付けて GET で呼ぶ。確かめる処理は modules/keepalive に任せる。
import { runKeepalive } from "@/modules/keepalive";
import { withRoute } from "@/shared/observability/with-route";

// ビルド時に結果を固めず、呼ばれるたびに実行する。
export const dynamic = "force-dynamic";

// Cron からの呼び出しの受け口。成功したら { ok: true } を返す。
export const GET = withRoute("keepalive.ping", async (request: Request) => {
  await runKeepalive(request.headers.get("authorization"));
  return Response.json({ ok: true });
});
