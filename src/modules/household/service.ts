// 世帯の機能のユースケース。
import "server-only";
import { findMembershipByUserId } from "./repository";

// 利用者が世帯に所属しているかどうかを返す。
// 退出したときは Membership の行を消すので、行があるかどうかで所属しているかが分かる。
export async function hasMembership(userId: string): Promise<boolean> {
  const membership = await findMembershipByUserId(userId);
  return membership !== null;
}
