-- テーブルと列に論理名と説明をコメントとして付ける。
-- 正本は docs/specs/02_basic-design/ の各機能の 01_データベース.md。
-- コメントは「論理名 + 改行 + 説明」の形にする（A5:SQL Mk-2 は最初の改行の手前を論理名として表示する）。

-- User（利用者）
COMMENT ON TABLE "User" IS E'利用者\nBetter Auth が作るテーブル。Google から受け取った名前とメールアドレスを保存する。';
COMMENT ON COLUMN "User"."id" IS E'ID\nBetter Auth が作る ID';
COMMENT ON COLUMN "User"."name" IS E'名前\nGoogle の名前';
COMMENT ON COLUMN "User"."email" IS E'メールアドレス\nGoogle のメールアドレス';
COMMENT ON COLUMN "User"."emailVerified" IS E'メール確認済み\nBetter Auth が使う';
COMMENT ON COLUMN "User"."image" IS E'画像\nBetter Auth が使う（画面には表示しない）';
COMMENT ON COLUMN "User"."createdAt" IS E'作成日時';
COMMENT ON COLUMN "User"."updatedAt" IS E'更新日時';

-- Household（世帯）
COMMENT ON TABLE "Household" IS E'世帯';
COMMENT ON COLUMN "Household"."id" IS E'ID\ncuid';
COMMENT ON COLUMN "Household"."name" IS E'世帯名\n世帯名。1〜20 文字';
COMMENT ON COLUMN "Household"."createdAt" IS E'作成日時';
COMMENT ON COLUMN "Household"."updatedAt" IS E'更新日時';

-- Membership（世帯への所属）
COMMENT ON TABLE "Membership" IS E'世帯への所属';
COMMENT ON COLUMN "Membership"."id" IS E'ID\ncuid';
COMMENT ON COLUMN "Membership"."userId" IS E'利用者ID\nUser.id への参照。1 人 1 行だけ';
COMMENT ON COLUMN "Membership"."householdId" IS E'世帯ID\nHousehold.id への参照';
COMMENT ON COLUMN "Membership"."role" IS E'役割\nOWNER = オーナー、MEMBER = 一般';
COMMENT ON COLUMN "Membership"."createdAt" IS E'参加日時\n参加した日時';

-- Invitation（招待コード）
COMMENT ON TABLE "Invitation" IS E'招待コード';
COMMENT ON COLUMN "Invitation"."id" IS E'ID\ncuid';
COMMENT ON COLUMN "Invitation"."householdId" IS E'世帯ID\nHousehold.id への参照。参加先の世帯';
COMMENT ON COLUMN "Invitation"."code" IS E'招待コード\nハイフンを除いた 8 文字';
COMMENT ON COLUMN "Invitation"."createdByUserId" IS E'発行者ID\nUser.id への参照。発行した人';
COMMENT ON COLUMN "Invitation"."expiresAt" IS E'有効期限\n有効期限（発行から 7 日後）';
COMMENT ON COLUMN "Invitation"."usedByUserId" IS E'使用者ID\nUser.id への参照。参加に使った人。未使用なら空';
COMMENT ON COLUMN "Invitation"."usedAt" IS E'使用日時\n参加に使われた日時。未使用なら空';
COMMENT ON COLUMN "Invitation"."createdAt" IS E'発行日時';

-- Contract（契約）
COMMENT ON TABLE "Contract" IS E'契約';
COMMENT ON COLUMN "Contract"."id" IS E'ID\ncuid';
COMMENT ON COLUMN "Contract"."householdId" IS E'世帯ID\nHousehold.id への参照';
COMMENT ON COLUMN "Contract"."utilityType" IS E'種別';
COMMENT ON COLUMN "Contract"."companyName" IS E'会社名\n会社名。1〜30 文字';
COMMENT ON COLUMN "Contract"."planName" IS E'プラン名\nプラン名。30 文字以内';
COMMENT ON COLUMN "Contract"."startDate" IS E'開始日';
COMMENT ON COLUMN "Contract"."endDate" IS E'終了日\n終了日。空は契約中。開始日以降';
COMMENT ON COLUMN "Contract"."memo" IS E'メモ\nメモ。200 文字以内';
COMMENT ON COLUMN "Contract"."createdAt" IS E'作成日時';
COMMENT ON COLUMN "Contract"."updatedAt" IS E'更新日時';

-- ContractItem（契約の内訳項目）
COMMENT ON TABLE "ContractItem" IS E'契約の内訳項目\n契約ごとに選んだ内訳項目。検針票の入力画面に並べる項目と順番を決める。';
COMMENT ON COLUMN "ContractItem"."id" IS E'ID\ncuid';
COMMENT ON COLUMN "ContractItem"."contractId" IS E'契約ID\nContract.id への参照';
COMMENT ON COLUMN "ContractItem"."name" IS E'項目名\n項目名。候補の項目名、または「その他」で入力した名前（1〜30 文字）';
COMMENT ON COLUMN "ContractItem"."category" IS E'分類\n集計用の分類';
COMMENT ON COLUMN "ContractItem"."isCustom" IS E'その他の項目か\n「その他」で追加した項目なら true';
COMMENT ON COLUMN "ContractItem"."sortOrder" IS E'表示順\n表示順。小さいほど上';
COMMENT ON COLUMN "ContractItem"."removedAt" IS E'外した日時\n外した日時。空なら選択中';
COMMENT ON COLUMN "ContractItem"."createdAt" IS E'作成日時';
COMMENT ON COLUMN "ContractItem"."updatedAt" IS E'更新日時';

-- MeterReading（検針票）
COMMENT ON TABLE "MeterReading" IS E'検針票';
COMMENT ON COLUMN "MeterReading"."id" IS E'ID\ncuid';
COMMENT ON COLUMN "MeterReading"."householdId" IS E'世帯ID\nHousehold.id への参照';
COMMENT ON COLUMN "MeterReading"."contractId" IS E'契約ID\nContract.id への参照';
COMMENT ON COLUMN "MeterReading"."utilityType" IS E'種別\n種別。契約の種別と同じ値を入れる';
COMMENT ON COLUMN "MeterReading"."usageMonth" IS E'使用月\n使用月（その月の 1 日）';
COMMENT ON COLUMN "MeterReading"."billingMonth" IS E'請求月\n請求月（その月の 1 日）';
COMMENT ON COLUMN "MeterReading"."amount" IS E'請求額\n請求額（税込・円）。0〜999,999';
COMMENT ON COLUMN "MeterReading"."periodStart" IS E'使用期間の開始日';
COMMENT ON COLUMN "MeterReading"."periodEnd" IS E'使用期間の終了日\n使用期間の終了日。開始日以降';
COMMENT ON COLUMN "MeterReading"."usage" IS E'使用量\n使用量。0〜99,999.9';
COMMENT ON COLUMN "MeterReading"."memo" IS E'メモ\nメモ。200 文字以内';
COMMENT ON COLUMN "MeterReading"."createdAt" IS E'作成日時';
COMMENT ON COLUMN "MeterReading"."updatedAt" IS E'更新日時';

-- MeterReadingItem（検針票の内訳）
COMMENT ON TABLE "MeterReadingItem" IS E'検針票の内訳\n金額を入力した内訳項目だけを保存する。';
COMMENT ON COLUMN "MeterReadingItem"."id" IS E'ID\ncuid';
COMMENT ON COLUMN "MeterReadingItem"."meterReadingId" IS E'検針票ID\nMeterReading.id への参照';
COMMENT ON COLUMN "MeterReadingItem"."contractItemId" IS E'契約の内訳項目ID\nContractItem.id への参照';
COMMENT ON COLUMN "MeterReadingItem"."name" IS E'項目名\n入力したときの項目名の控え';
COMMENT ON COLUMN "MeterReadingItem"."category" IS E'分類\n入力したときの分類の控え';
COMMENT ON COLUMN "MeterReadingItem"."amount" IS E'金額\n金額（円）。割引・補助は負。−999,999〜999,999';
COMMENT ON COLUMN "MeterReadingItem"."quantity" IS E'数量\n数量。0〜99,999.9';
COMMENT ON COLUMN "MeterReadingItem"."unitPrice" IS E'単価\n単価。−9,999.999〜9,999.999';
COMMENT ON COLUMN "MeterReadingItem"."sortOrder" IS E'並び順\n入力画面での並び順。小さいほど上';
