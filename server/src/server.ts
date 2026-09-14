import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import express from "express";
import { Server, type Socket } from "socket.io";
import { Room, generatePlayerId, type RoomPlayer } from "./game/room.js";
import type { EmojiConfirmedPayload, GameOverPayload } from "./game/room.js";
import type { RejectReason } from "./game/wordChain.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// server/dist/server.js 기준 ../../client/dist
const clientDistPath = path.resolve(__dirname, "../../client/dist");

const app = express();

if (fs.existsSync(clientDistPath)) {
  // 배포/터널링용: 빌드된 client를 같은 포트에서 같이 서빙
  app.use(express.static(clientDistPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
} else {
  // 로컬 개발 중 (client는 vite dev 서버 :5173 에서 따로 실행됨)
  app.get("/", (_req, res) => {
    res.send("emoji-word-chain server running (dev mode - client is on :5173)");
  });
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }, // TODO: 배포 시 실제 클라이언트 origin으로 제한
});

const rooms = new Map<string, Room>();
// socketId -> { roomId, playerId }
const socketIndex = new Map<string, { roomId: string; playerId: string }>();

function publicRoomState(room: Room) {
  return {
    roomId: room.id,
    status: room.status,
    hostId: room.hostId,
    players: room.players.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      isBot: p.isBot,
    })),
    currentTurnPlayerId: room.status === "playing" ? room.currentPlayer().id : null,
    lastWord: room.lastWord,
    usedWords: [...room.usedWords],
    deadline: room.deadline,
    winnerId: room.winnerId ?? null,
  };
}

function broadcastState(room: Room) {
  io.to(room.id).emit("room:state", publicRoomState(room));
}

function wireRoomEvents(room: Room) {
  room.on("gameStarted", (payload: { startingEmoji: string; startingWord: string }) => {
    io.to(room.id).emit("game:started", payload);
  });

  room.on("turnStart", (payload: { playerId: string; deadline: number }) => {
    io.to(room.id).emit("turn:start", payload);
    broadcastState(room);
  });

  room.on("emojiConfirmed", (payload: EmojiConfirmedPayload) => {
    io.to(room.id).emit("emoji:confirmed", payload);
  });

  room.on(
    "emojiRejected",
    (payload: { playerId: string; reason: RejectReason }) => {
      const player = room.players.find((p) => p.id === payload.playerId);
      if (player?.socketId) {
        io.to(player.socketId).emit("emoji:rejected", { reason: payload.reason });
      }
    }
  );

  room.on("gameOver", (payload: GameOverPayload) => {
    io.to(room.id).emit("game:over", payload);
    broadcastState(room);
  });
}

io.on("connection", (socket: Socket) => {
  socket.on(
    "room:create",
    (
      data: { nickname: string; vsBot?: boolean },
      ack: (res: { ok: true; roomId: string; playerId: string } | { ok: false; error: string }) => void
    ) => {
      const playerId = generatePlayerId();
      const room = new Room(playerId);
      wireRoomEvents(room);

      const hostPlayer: RoomPlayer = {
        id: playerId,
        nickname: data.nickname || "Player",
        socketId: socket.id,
        isBot: false,
      };
      room.addPlayer(hostPlayer);
      rooms.set(room.id, room);
      socketIndex.set(socket.id, { roomId: room.id, playerId });
      socket.join(room.id);

      if (data.vsBot) {
        const botPlayer: RoomPlayer = {
          id: generatePlayerId(),
          nickname: "Bot",
          socketId: null,
          isBot: true,
        };
        room.addPlayer(botPlayer);
        room.start();
      }

      broadcastState(room);
      ack({ ok: true, roomId: room.id, playerId });
    }
  );

  socket.on(
    "room:join",
    (
      data: { roomId: string; nickname: string },
      ack: (res: { ok: true; playerId: string } | { ok: false; error: string }) => void
    ) => {
      const room = rooms.get(data.roomId);
      if (!room) {
        ack({ ok: false, error: "ROOM_NOT_FOUND" });
        return;
      }
      if (room.isFull) {
        ack({ ok: false, error: "ROOM_FULL" });
        return;
      }

      const playerId = generatePlayerId();
      const player: RoomPlayer = {
        id: playerId,
        nickname: data.nickname || "Player",
        socketId: socket.id,
        isBot: false,
      };
      room.addPlayer(player);
      socketIndex.set(socket.id, { roomId: room.id, playerId });
      socket.join(room.id);

      ack({ ok: true, playerId });
      broadcastState(room);

      if (room.isFull) {
        room.start();
      }
    }
  );

  socket.on("emoji:submit", (data: { emoji: string }) => {
    const idx = socketIndex.get(socket.id);
    if (!idx) return;
    const room = rooms.get(idx.roomId);
    if (!room) return;
    room.submitEmoji(idx.playerId, data.emoji);
  });

  socket.on("game:rematch", () => {
    const idx = socketIndex.get(socket.id);
    if (!idx) return;
    const room = rooms.get(idx.roomId);
    if (!room) return;
    if (room.status !== "finished") return;
    room.rematch();
    broadcastState(room);
  });

  // F2 dev shortcut: force a win for the requesting player
  socket.on("dev:win", () => {
    const idx = socketIndex.get(socket.id);
    if (!idx) return;
    const room = rooms.get(idx.roomId);
    if (!room || room.status !== "playing") return;
    room.handleDisconnect(room.players.find((p) => p.id !== idx.playerId)!.id);
    broadcastState(room);
  });

  // 대기 취소 / 기권 / 로비로 나가기 — 클라이언트가 페이지 이동만 하고
  // 소켓 연결은 유지하는 경우이므로 disconnect 이벤트로는 잡히지 않는다.
  // 별도로 처리해서 상대방에게 즉시 알리고 방을 정리한다.
  socket.on("room:leave", () => {
    const idx = socketIndex.get(socket.id);
    if (!idx) return;

    socket.leave(idx.roomId);
    socketIndex.delete(socket.id);

    const room = rooms.get(idx.roomId);
    if (!room) return;

    if (room.status === "playing") {
      // 진행 중이던 게임은 상대방 승리로 즉시 종료 (handleDisconnect와 동일 처리)
      room.handleDisconnect(idx.playerId);
    } else if (room.status === "waiting") {
      // 상대가 들어오기 전 대기 중 나간 경우 — 혼자였으므로 방을 바로 정리
      room.destroy();
      rooms.delete(idx.roomId);
      return;
    }

    // 60초 뒤에도 아무도 이 방을 참조하지 않으면 완전히 정리 (disconnect 핸들러와 동일한 유예)
    setTimeout(() => {
      const stillReferenced = [...socketIndex.values()].some(
        (v) => v.roomId === idx.roomId
      );
      if (!stillReferenced) {
        const r = rooms.get(idx.roomId);
        if (r) {
          r.destroy();
          rooms.delete(idx.roomId);
        }
      }
    }, 60_000);
  });

  socket.on("disconnect", () => {
    const idx = socketIndex.get(socket.id);
    if (!idx) return;
    socketIndex.delete(socket.id);
    const room = rooms.get(idx.roomId);
    if (!room) return;
    room.handleDisconnect(idx.playerId);
    // Prototype: no reconnection support. Clean up room after it's over
    // and both real sockets have left, to avoid unbounded memory growth.
    setTimeout(() => {
      const stillReferenced = [...socketIndex.values()].some(
        (v) => v.roomId === room.id
      );
      if (!stillReferenced) {
        room.destroy();
        rooms.delete(room.id);
      }
    }, 60_000);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[emoji-word-chain] server listening on :${PORT}`);
});
