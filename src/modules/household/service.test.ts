/**
 * テストの目的（大項目）
 * 1. hasMembership: 所属（Membership）の行があれば true、無ければ false を返すこと
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// server-only は Next.js の外で import すると例外を投げるため、テストでは空のものに差し替える。
vi.mock("server-only", () => ({}));

// DB を使わずに試すため、repository を偽物に差し替える。
const findMembershipByUserId = vi.fn();
vi.mock("./repository", () => ({ findMembershipByUserId }));

const { hasMembership } = await import("./service");

describe("household/service", () => {
  beforeEach(() => {
    findMembershipByUserId.mockReset();
  });

  describe("hasMembership", () => {
    it("所属の行があるときは true を返す", async () => {
      findMembershipByUserId.mockResolvedValue({ id: "m1", userId: "u1", householdId: "h1" });
      await expect(hasMembership("u1")).resolves.toBe(true);
      expect(findMembershipByUserId).toHaveBeenCalledWith("u1");
    });

    it("所属の行が無いときは false を返す", async () => {
      findMembershipByUserId.mockResolvedValue(null);
      await expect(hasMembership("u1")).resolves.toBe(false);
    });
  });
});
