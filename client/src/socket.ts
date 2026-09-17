import { io, type Socket } from "socket.io-client";

const SERVER_URL = import.meta.env.DEV ? "http://localhost:3001" : undefined;

export const socket: Socket = io(SERVER_URL, {
  autoConnect: true,
});
