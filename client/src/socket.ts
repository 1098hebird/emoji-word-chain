import { io, type Socket } from "socket.io-client";

// 개발 모드(vite dev, :5173)일 때만 서버를 localhost:3001로 명시.
// 빌드된 상태(서버가 client/dist를 같은 origin에서 서빙)에서는 undefined를 넘겨
// socket.io-client가 현재 페이지와 같은 origin으로 자동 접속하게 함.
// (터널링/배포 시 URL이 바뀌어도 코드 수정 불필요)
const SERVER_URL = import.meta.env.DEV ? "http://localhost:3001" : undefined;

export const socket: Socket = io(SERVER_URL, {
  autoConnect: true,
});
