"use server";
// 世帯の画面操作（Server Action）の入口。
// 振り分け（proxy.ts）は画面の表示でしか行わないため、どの操作も最初にログインと所属をここで確かめる。
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { HOME_PATH, requireUser, SETUP_PATH } from "@/modules/auth";
import { withAction } from "@/shared/observability/with-action";
import {
  createHousehold,
  issueInvitation,
  joinHousehold,
  leaveHousehold,
  renameHousehold,
  requireMembership,
} from "./service";
import type { HouseholdNameInput, JoinHouseholdInput } from "./validation";

// 設定の画面（S07）の URL。世帯名や招待コードを変えた後に、この画面のデータを読み直させる。
const SETTINGS_PATH = "/settings";

// S02「参加する」。参加できたら（すでに所属していた場合も）ホームへ移す。
export const joinHouseholdAction = withAction(
  "household.join",
  async (input: JoinHouseholdInput) => {
    // 世帯に入る前なので、所属ではなくログインだけを確かめる。
    const user = await requireUser();
    await joinHousehold(user.id, input);
    // redirect() は Next.js が画面を切り替えるための合図を投げる。withAction はこれを受け止めずに通す。
    redirect(HOME_PATH);
  },
);

// S02「世帯を作成」。作れたら（すでに所属していた場合も）ホームへ移す。
export const createHouseholdAction = withAction(
  "household.create",
  async (input: HouseholdNameInput) => {
    const user = await requireUser();
    await createHousehold(user.id, input);
    redirect(HOME_PATH);
  },
);

// S07「世帯名の保存」。保存したら、設定の画面のデータを読み直させる。
export const renameHouseholdAction = withAction(
  "household.rename",
  async (input: HouseholdNameInput) => {
    const membership = await requireMembership();
    await renameHousehold(membership, input);
    revalidatePath(SETTINGS_PATH);
  },
);

// S07「コードを発行」。発行したら、一覧に加わるよう設定の画面のデータを読み直させる。
export const issueInvitationAction = withAction("household.issueInvitation", async () => {
  const membership = await requireMembership();
  await issueInvitation(membership);
  revalidatePath(SETTINGS_PATH);
});

// S07「世帯から退出」。退出したら初回設定の画面へ移す。
export const leaveHouseholdAction = withAction("household.leave", async () => {
  const membership = await requireMembership();
  await leaveHousehold(membership);
  redirect(SETUP_PATH);
});
