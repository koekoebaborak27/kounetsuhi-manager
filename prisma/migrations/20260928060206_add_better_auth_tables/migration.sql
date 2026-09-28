-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ(3),
    "refreshTokenExpiresAt" TIMESTAMPTZ(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- テーブルと列に論理名と説明をコメントとして付ける。
-- 正本は docs/specs/02_basic-design/01_認証と世帯/01_データベース.md。
-- コメントは「論理名 + 改行 + 説明」の形にする（A5:SQL Mk-2 は最初の改行の手前を論理名として表示する）。

-- Session（ログイン状態）
COMMENT ON TABLE "Session" IS E'ログイン状態\nログインしているブラウザごとに 1 行。Better Auth が作る';
COMMENT ON COLUMN "Session"."id" IS E'ID\nBetter Auth が作る ID';
COMMENT ON COLUMN "Session"."expiresAt" IS E'有効期限\nこの日時を過ぎるとログアウトした扱いになる';
COMMENT ON COLUMN "Session"."token" IS E'トークン\nブラウザのクッキーに入れる、ログイン状態を見分けるための値';
COMMENT ON COLUMN "Session"."createdAt" IS E'作成日時';
COMMENT ON COLUMN "Session"."updatedAt" IS E'更新日時';
COMMENT ON COLUMN "Session"."ipAddress" IS E'IPアドレス\nログインしたときの接続元';
COMMENT ON COLUMN "Session"."userAgent" IS E'ブラウザの情報\nログインしたときのブラウザの種類';
COMMENT ON COLUMN "Session"."userId" IS E'利用者ID\nUser.id への参照';

-- Account（外部アカウント）
COMMENT ON TABLE "Account" IS E'外部アカウント\nGoogle アカウントとの結び付き。Better Auth が作る';
COMMENT ON COLUMN "Account"."id" IS E'ID\nBetter Auth が作る ID';
COMMENT ON COLUMN "Account"."accountId" IS E'外部アカウントID\nGoogle 側の利用者の ID';
COMMENT ON COLUMN "Account"."providerId" IS E'ログイン方法\nログインに使ったサービスの名前（google）';
COMMENT ON COLUMN "Account"."userId" IS E'利用者ID\nUser.id への参照';
COMMENT ON COLUMN "Account"."accessToken" IS E'アクセストークン\nGoogle から受け取った値。アプリでは使わない';
COMMENT ON COLUMN "Account"."refreshToken" IS E'リフレッシュトークン\nGoogle から受け取った値。アプリでは使わない';
COMMENT ON COLUMN "Account"."idToken" IS E'IDトークン\nGoogle から受け取った本人確認の値';
COMMENT ON COLUMN "Account"."accessTokenExpiresAt" IS E'アクセストークンの有効期限';
COMMENT ON COLUMN "Account"."refreshTokenExpiresAt" IS E'リフレッシュトークンの有効期限';
COMMENT ON COLUMN "Account"."scope" IS E'許可範囲\nGoogle に求めた情報の範囲（openid・email・profile）';
COMMENT ON COLUMN "Account"."password" IS E'パスワード\nメールアドレスとパスワードでのログイン用。Google ログインだけなので使わない（常に空）';
COMMENT ON COLUMN "Account"."createdAt" IS E'作成日時';
COMMENT ON COLUMN "Account"."updatedAt" IS E'更新日時';

-- Verification（確認用の一時データ）
COMMENT ON TABLE "Verification" IS E'確認用の一時データ\nログインの途中で使う一時的な値（Google から戻ってきたときの照合用など）。Better Auth が作る';
COMMENT ON COLUMN "Verification"."id" IS E'ID\nBetter Auth が作る ID';
COMMENT ON COLUMN "Verification"."identifier" IS E'識別子\n何のための値かを見分けるキー';
COMMENT ON COLUMN "Verification"."value" IS E'値\n保存する値';
COMMENT ON COLUMN "Verification"."expiresAt" IS E'有効期限\nこの日時を過ぎた値は使えない';
COMMENT ON COLUMN "Verification"."createdAt" IS E'作成日時';
COMMENT ON COLUMN "Verification"."updatedAt" IS E'更新日時';
