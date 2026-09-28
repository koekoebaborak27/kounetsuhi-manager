// 世帯の機能で、画面やほかの機能に渡すデータの型。

// 世帯での役割。OWNER = オーナー（世帯を作った人）、MEMBER = 一般（招待コードで参加した人）。
export type MemberRole = "OWNER" | "MEMBER";

// ログイン中の人の所属。ほかの機能は、householdId でデータを世帯の分だけに絞り込む。
export type CurrentMembership = {
  userId: string;
  householdId: string;
  role: MemberRole;
};

// S07 設定のメンバーの 1 行。
export type MemberView = {
  userId: string;
  name: string;
  email: string;
  role: MemberRole;
};

// S07 設定の招待コードの 1 行。表示の形に整えてから画面へ渡す。
export type InvitationView = {
  id: string;
  // 「K7Q2-9XMA」の形のコード。
  code: string;
  // 「YYYY/MM/DD」の形の有効期限（日本時間）。
  expiresOn: string;
};

// S07 設定の画面に出す世帯の情報。
export type HouseholdSettings = {
  householdName: string;
  // ログイン中の人の役割。「世帯から退出」を出すかどうかに使う。
  myRole: MemberRole;
  members: MemberView[];
  invitations: InvitationView[];
};
