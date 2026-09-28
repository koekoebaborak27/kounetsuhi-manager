import { SetupScreen } from "@/modules/household";

// S02 初回設定の画面（/setup）。世帯に所属していない人だけが開ける（振り分けは src/proxy.ts）。
export default function SetupPage() {
  return <SetupScreen />;
}
