// DB の一時停止を防ぐ機能の公開 API。ほかの機能や画面（src/app）からは、ここに書いたものだけを使う。
export { runKeepalive } from "./service";
