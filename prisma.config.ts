import { defineConfig, env } from "prisma/config";

// .env に書いた DATABASE_URL などを読み込む。
// この設定ファイルがあると Prisma CLI は .env を自分で読まなくなるため、ここで読み込む。
// CI や本番のように .env が無い環境では何もせず、実行環境に設定された値だけを使う。
try {
  process.loadEnvFile();
} catch {
  // .env が無いときは読み込みを飛ばす。
}

// Prisma CLI の設定。スキーマ・マイグレーションの置き場所と、接続先の DB を決める。
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
