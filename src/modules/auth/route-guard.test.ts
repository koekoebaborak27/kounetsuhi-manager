/**
 * テストの目的（大項目）
 * 1. 画面の表示（GET・HEAD）では、設計書「画面の振り分け」の表のとおりに移す先を返すこと
 * 2. 画面操作（POST など）では、どの状態でも移さないこと（Server Action の POST を移すと往復が止まらなくなるため）
 */
import { describe, it, expect } from "vitest";
import { decideRedirect, type RouteGuardInput } from "./route-guard";

// 判定に渡す情報を作る。指定しなかった項目は「GET でホームを開いた、ログイン済み・世帯に所属済みの人」にする。
function input(overrides: Partial<RouteGuardInput>): RouteGuardInput {
  return { method: "GET", pathname: "/", isLoggedIn: true, hasHousehold: true, ...overrides };
}

describe("decideRedirect", () => {
  describe("ログインしていないとき", () => {
    const state = { isLoggedIn: false, hasHousehold: false };

    it.each(["/", "/settings", "/records", "/setup", "/unknown"])(
      "%s を開くとログイン画面へ移す",
      (pathname) => {
        expect(decideRedirect(input({ ...state, pathname }))).toBe("/login");
      },
    );

    it("ログイン画面を開いたときは移さない", () => {
      expect(decideRedirect(input({ ...state, pathname: "/login" }))).toBeNull();
    });
  });

  describe("ログイン済み・世帯に未所属のとき", () => {
    const state = { isLoggedIn: true, hasHousehold: false };

    it.each(["/", "/settings", "/login"])("%s を開くと初回設定の画面へ移す", (pathname) => {
      expect(decideRedirect(input({ ...state, pathname }))).toBe("/setup");
    });

    it("初回設定の画面を開いたときは移さない", () => {
      expect(decideRedirect(input({ ...state, pathname: "/setup" }))).toBeNull();
    });
  });

  describe("ログイン済み・世帯に所属済みのとき", () => {
    it.each(["/login", "/setup"])("%s を開くとホームへ移す", (pathname) => {
      expect(decideRedirect(input({ pathname }))).toBe("/");
    });

    it.each(["/", "/settings", "/records", "/graphs"])("%s を開いたときは移さない", (pathname) => {
      expect(decideRedirect(input({ pathname }))).toBeNull();
    });

    it("/setup で始まる別の URL（/setupx）は初回設定の画面として扱わない", () => {
      expect(decideRedirect(input({ pathname: "/setupx" }))).toBeNull();
    });
  });

  describe("リクエストの種類ごと", () => {
    it("HEAD は GET と同じく振り分ける", () => {
      expect(decideRedirect(input({ method: "HEAD", isLoggedIn: false }))).toBe("/login");
    });

    it.each(["POST", "PUT", "DELETE"])("%s はログインしていなくても移さない", (method) => {
      expect(decideRedirect(input({ method, isLoggedIn: false, hasHousehold: false }))).toBeNull();
    });

    it("POST は世帯に未所属でも移さない", () => {
      expect(decideRedirect(input({ method: "POST", hasHousehold: false }))).toBeNull();
    });
  });
});
