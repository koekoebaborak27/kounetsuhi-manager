import nextVitals from "eslint-config-next/core-web-vitals";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

// ESLint の設定。Next.js の公式設定を先頭に置き、そのあとに TypeScript 用の推奨ルールを重ねる。
/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...nextVitals,
  ...tseslint.configs.recommended,
  // Prettier と競合する整形系ルールを無効化（format は Prettier に一任）
  prettier,
  {
    ignores: [
      "node_modules/**",
      "coverage/**",
      ".next/**",
      "next-env.d.ts",
      "playwright.config.ts",
      "e2e/**",
      // Prisma が生成するコード（手で直さないため検査しない）
      "src/shared/db/generated/**",
    ],
  },
];

export default config;
