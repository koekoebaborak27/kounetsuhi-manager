/**
 * テストの目的（大項目）
 * 1. generateInvitationCode: 見分けにくい文字を除いた 32 文字から 8 文字のコードを作ること
 * 2. normalizeInvitationCode: 前後の空白とハイフンを除き、大文字にそろえること
 * 3. isInvitationCodeShape: 使える文字だけの 8 文字かどうかを判定すること
 * 4. formatInvitationCode: 「K7Q2-9XMA」の形にすること
 * 5. invitationExpiresAt: 発行した時刻の 7 日後を返すこと
 */
import { describe, it, expect } from "vitest";
import {
  formatInvitationCode,
  generateInvitationCode,
  INVITATION_CODE_CHARS,
  invitationExpiresAt,
  isInvitationCodeShape,
  normalizeInvitationCode,
} from "./invitation-code";

describe("household/invitation-code", () => {
  describe("INVITATION_CODE_CHARS", () => {
    it("32 文字で、見分けにくい 0・O・1・I を含まない", () => {
      expect(INVITATION_CODE_CHARS).toHaveLength(32);
      expect(INVITATION_CODE_CHARS).not.toMatch(/[0O1I]/);
      expect(new Set(INVITATION_CODE_CHARS).size).toBe(32);
    });
  });

  describe("generateInvitationCode", () => {
    it("乱数で選んだ位置の文字を 8 つ並べる", () => {
      const picks = [0, 1, 2, 3, 28, 29, 30, 31];
      let i = 0;
      expect(generateInvitationCode(() => picks[i++])).toBe("ABCD6789");
    });

    it("乱数には文字の数（32）を上限として渡す", () => {
      const maxes: number[] = [];
      generateInvitationCode((max) => {
        maxes.push(max);
        return 0;
      });
      expect(maxes).toEqual(Array(8).fill(32));
    });

    it("作ったコードは使える文字の 8 文字の形になる", () => {
      const code = generateInvitationCode((max) => Math.floor(Math.random() * max));
      expect(isInvitationCodeShape(code)).toBe(true);
    });
  });

  describe("normalizeInvitationCode", () => {
    it("ハイフンを取り除く", () => {
      expect(normalizeInvitationCode("K7Q2-9XMA")).toBe("K7Q29XMA");
    });

    it("前後の空白を取り除く", () => {
      expect(normalizeInvitationCode("  K7Q2-9XMA \t")).toBe("K7Q29XMA");
    });

    it("英小文字を大文字にする", () => {
      expect(normalizeInvitationCode("k7q2-9xma")).toBe("K7Q29XMA");
    });

    it("空白とハイフンだけのときは空の文字列になる", () => {
      expect(normalizeInvitationCode(" - ")).toBe("");
    });
  });

  describe("isInvitationCodeShape", () => {
    it("使える文字だけの 8 文字なら true", () => {
      expect(isInvitationCodeShape("K7Q29XMA")).toBe(true);
    });

    it("7 文字なら false", () => {
      expect(isInvitationCodeShape("K7Q29XM")).toBe(false);
    });

    it("9 文字なら false", () => {
      expect(isInvitationCodeShape("K7Q29XMAB")).toBe(false);
    });

    it("使えない文字（0・O・1・I）を含むと false", () => {
      expect(isInvitationCodeShape("K7Q29XM0")).toBe(false);
      expect(isInvitationCodeShape("K7Q29XMO")).toBe(false);
      expect(isInvitationCodeShape("K7Q29XM1")).toBe(false);
      expect(isInvitationCodeShape("K7Q29XMI")).toBe(false);
    });

    it("英小文字を含むと false（照合の前に大文字にそろえる前提）", () => {
      expect(isInvitationCodeShape("k7q29xma")).toBe(false);
    });
  });

  describe("formatInvitationCode", () => {
    it("4 文字ずつハイフンでつなぐ", () => {
      expect(formatInvitationCode("K7Q29XMA")).toBe("K7Q2-9XMA");
    });
  });

  describe("invitationExpiresAt", () => {
    it("発行した時刻のちょうど 7 日後を返す", () => {
      const issuedAt = new Date("2026-09-28T10:15:00.000Z");
      expect(invitationExpiresAt(issuedAt)).toEqual(new Date("2026-10-05T10:15:00.000Z"));
    });
  });
});
