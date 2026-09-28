// ログイン中の人の情報。画面やほかの機能に渡すときに使う。
export type CurrentUser = {
  id: string;
  name: string;
  email: string;
};
