import twemoji from "twemoji";
import { socket } from "./socket";
import { CATEGORIES, getWordFor, getAllEmojis } from "./data/emojiData";
import type {
  RoomStatePayload,
  GameStartedPayload,
  TurnStartPayload,
  EmojiConfirmedPayload,
  EmojiRejectedPayload,
  GameOverPayload,
} from "./types";

const app = document.getElementById("app")!;
const isDevelopment = import.meta.env.DEV;
const DEV_WIN_PATH = "/dev/win";

type Screen = "lobby" | "waiting" | "playing" | "gameover";

interface ToastState {
  message: string;
  type?: "info" | "error";
}

interface AppState {
  screen: Screen;
  myPlayerId: string | null;
  room: RoomStatePayload | null;
  activeCategoryId: string;
  chainHistory: string[];
  popupEmoji: string | null;
  toast: ToastState | null;
  lastGameOver: GameOverPayload | null;
  hideRoomCode: boolean;
  theme: "dark" | "light";
}

const initialTheme = (localStorage.getItem("emoji_theme") as "dark" | "light") || "light";



const state: AppState = {
  screen: "lobby",
  myPlayerId: null,
  room: null,
  activeCategoryId: CATEGORIES[0].id,
  chainHistory: [],
  popupEmoji: null,
  toast: null,
  lastGameOver: null,
  hideRoomCode: true,
  theme: initialTheme,

};

function normalizePath(path: string): string {
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

function isDevWinRoute(): boolean {
  return isDevelopment && normalizePath(window.location.pathname) === DEV_WIN_PATH;
}

function navigateTo(path: string) {
  window.history.pushState({}, "", path);
  render();
}

function requestDevWin() {
  if (
    !isDevelopment ||
    devWinRequested ||
    state.screen !== "playing"
  ) {
    return;
  }
  devWinRequested = true;
  socket.emit("dev:win");
}

function applyTheme() {
  document.documentElement.setAttribute("data-theme", state.theme);
}
applyTheme();

function updateThemeButtons() {
  const isDark = state.theme === "dark";
  document.querySelectorAll<HTMLButtonElement>("#themeToggleBtn").forEach((button) => {
    const isCompact = button.closest(".hud") !== null;
    button.textContent = isDark
      ? (isCompact ? "☀️" : "☀️ 라이트 모드")
      : (isCompact ? "🌙" : "🌙 다크 모드");
  });
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  localStorage.setItem("emoji_theme", state.theme);
  applyTheme();
  updateThemeButtons();
}

let timerInterval: number | null = null;
let timerEndTime: number = 0;
let devWinRequested = false;

function render() {
  applyTheme();
  if (!isDevWinRoute()) devWinRequested = false;
  app.innerHTML = "";
  if (isDevWinRoute()) app.appendChild(renderDevWin());
  else if (state.screen === "lobby") app.appendChild(renderLobby());
  else if (state.screen === "waiting") app.appendChild(renderWaiting());
  else if (state.screen === "playing") app.appendChild(renderPlaying());
  else if (state.screen === "gameover") app.appendChild(renderGameOver());

  if (state.popupEmoji) app.appendChild(renderPopup(state.popupEmoji));
  if (state.toast) app.appendChild(renderToast(state.toast));

  twemoji.parse(app, {
    folder: "svg",
    ext: ".svg",
    base: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/",
  });
}

function showToast(message: string, type: "info" | "error" = "error") {
  state.toast = { message, type };
  render();
}

function renderLobby(): HTMLElement {
  const div = document.createElement("div");
  div.className = "screen";
  div.innerHTML = `
    <div class="top-bar">
      <span></span>
      <button type="button" class="theme-toggle-btn" id="themeToggleBtn">
        ${state.theme === "dark" ? "☀️ 라이트 모드" : "🌙 다크 모드"}
      </button>
    </div>
    <h2>이모지 끝말잇기</h2>
    <input type="text" id="nickname" placeholder="닉네임" value="Player" />
    <label class="check"><input type="checkbox" id="vsBot" /> 봇과 대결 (테스트용)</label>
    <button id="createBtn">방 만들기</button>
    <hr style="width:100%;border-color:var(--border);" />
    <input type="text" id="joinCode" placeholder="방 코드 6자리" />
    <button id="joinBtn">방 참가</button>
    <footer class="attribution">
      이모지 그래픽: <a href="https://twemoji.twitter.com/" target="_blank">Twemoji</a> (Twitter / X, CC-BY 4.0)<br/>
      이모지 데이터: <a href="https://github.com/muan/unicode-emoji-json" target="_blank">unicode-emoji-json</a> (Unicode CLDR, MIT)
    </footer>
  `;

  div.querySelector<HTMLButtonElement>("#themeToggleBtn")!.onclick = toggleTheme;

  div.querySelector<HTMLButtonElement>("#createBtn")!.onclick = () => {
    const nickname = (div.querySelector("#nickname") as HTMLInputElement).value || "Player";
    const vsBot = (div.querySelector("#vsBot") as HTMLInputElement).checked;
    socket.emit(
      "room:create",
      { nickname, vsBot },
      (res: { ok: true; roomId: string; playerId: string } | { ok: false; error: string }) => {
        if (!res.ok) {
          showToast(res.error);
          return;
        }
        state.myPlayerId = res.playerId;
        state.screen = vsBot ? "playing" : "waiting";
        render();
      }
    );
  };

  div.querySelector<HTMLButtonElement>("#joinBtn")!.onclick = () => {
    const nickname = (div.querySelector("#nickname") as HTMLInputElement).value || "Player";
    const roomId = (div.querySelector("#joinCode") as HTMLInputElement).value.trim();
    if (!roomId) {
      showToast("방 코드를 입력해주세요.");
      return;
    }
    socket.emit(
      "room:join",
      { roomId, nickname },
      (res: { ok: true; playerId: string } | { ok: false; error: string }) => {
        if (!res.ok) {
          showToast(res.error);
          return;
        }
        state.myPlayerId = res.playerId;
        state.screen = "playing";
        render();
      }
    );
  };

  return div;
}

function renderWaiting(): HTMLElement {
  const div = document.createElement("div");
  div.className = "screen";
  const code = state.room?.roomId ?? "------";
  const displayCode = state.hideRoomCode ? "●●●●    " : code;
  div.innerHTML = `
    <div class="top-bar">
      <span></span>
      <button type="button" class="theme-toggle-btn" id="themeToggleBtn">
        ${state.theme === "dark" ? "☀️ 라이트 모드" : "🌙 다크 모드"}
      </button>
    </div>
    <h2>상대를 기다리는 중...</h2>
    <p style="text-align:center;color:var(--text-muted);margin:4px 0 10px;">이 코드를 상대에게 공유하세요.</p>
    <div class="room-code-box">
      <span class="room-code-display">${displayCode}</span>
      <button type="button" class="icon-btn" id="toggleCodeBtn">
        ${state.hideRoomCode ? "👁️ 보기" : "🔒 가리기"}
      </button>
      <button type="button" class="icon-btn" id="copyCodeBtn">📋 복사</button>
    </div>
    <button id="cancelWaitBtn" class="secondary" style="margin-top:12px;">대기 취소하고 로비로</button>
    <footer class="attribution">
      이모지 그래픽: <a href="https://twemoji.twitter.com/" target="_blank">Twemoji</a> (CC-BY 4.0)
    </footer>
  `;

  div.querySelector<HTMLButtonElement>("#themeToggleBtn")!.onclick = toggleTheme;

  div.querySelector<HTMLButtonElement>("#toggleCodeBtn")!.onclick = () => {
    state.hideRoomCode = !state.hideRoomCode;
    render();
  };

  div.querySelector<HTMLButtonElement>("#copyCodeBtn")!.onclick = () => {
    navigator.clipboard.writeText(code).then(() => {
      showToast("방 코드가 복사되었습니다!", "info");
    }).catch(() => {
      showToast("복사에 실패했습니다.");
    });
  };

  div.querySelector<HTMLButtonElement>("#cancelWaitBtn")!.onclick = () => {
    socket.emit("room:leave");
    state.screen = "lobby";
    state.room = null;
    render();
  };

  return div;
}

function renderPlaying(): HTMLElement {
  const div = document.createElement("div");
  div.className = "screen playing-screen";

  const room = state.room;
  const isMyTurn = !!room && room.currentTurnPlayerId === state.myPlayerId;

  const hud = document.createElement("div");
  hud.className = "hud";
  hud.innerHTML = `
    <div class="hud-turn ${isMyTurn ? "my-turn" : "other-turn"}">
      ${isMyTurn ? "🔥 내 턴" : "⏳ 상대 턴"}
    </div>
    <span class="timer" id="timerText">--</span>
    <div class="hud-actions">
      <button type="button" class="theme-toggle-btn" id="themeToggleBtn" style="padding:4px 8px;font-size:12px;">
        ${state.theme === "dark" ? "☀️" : "🌙"}
      </button>
      <button type="button" class="surrender-btn" id="surrenderBtn">기권</button>
    </div>
  `;

  hud.querySelector<HTMLButtonElement>("#themeToggleBtn")!.onclick = toggleTheme;

  hud.querySelector<HTMLButtonElement>("#surrenderBtn")!.onclick = () => {
    if (confirm("정말 기권하고 로비로 나갈까요? (패배 처리됩니다)")) {
      socket.emit("room:leave");
      state.screen = "lobby";
      state.room = null;
      render();
    }
  };

  if (isDevelopment) {
    const devWinLink = document.createElement("a");
    devWinLink.href = DEV_WIN_PATH;
    devWinLink.className = "dev-link";
    devWinLink.id = "devWinLink";
    devWinLink.textContent = "개발 승리";
    devWinLink.onclick = (event) => {
      event.preventDefault();
      navigateTo(DEV_WIN_PATH);
    };
    hud.querySelector<HTMLDivElement>(".hud-actions")!.appendChild(devWinLink);
  }


  div.appendChild(hud);

  const lastWordEl = document.createElement("div");
  lastWordEl.className = "last-word";
  lastWordEl.innerHTML = room?.lastWord ? `마지막 단어: <strong>${room.lastWord}</strong>` : "";
  div.appendChild(lastWordEl);

  const history = document.createElement("div");
  history.className = "chain-history";
  history.innerHTML = state.chainHistory.map((e) => `<span>${e}</span>`).join("");
  div.appendChild(history);

  const tabs = document.createElement("div");
  tabs.className = "category-tabs";
  for (const cat of CATEGORIES) {
    const btn = document.createElement("button");
    btn.textContent = cat.name;
    if (cat.id === state.activeCategoryId) btn.classList.add("active");
    btn.onclick = () => {
      state.activeCategoryId = cat.id;
      render();
    };
    tabs.appendChild(btn);
  }
  div.appendChild(tabs);

  const grid = document.createElement("div");
  grid.className = "emoji-grid";
  const activeCat = CATEGORIES.find((c) => c.id === state.activeCategoryId)!;
  for (const entry of activeCat.emojis) {
    const cell = document.createElement("div");
    cell.className = "emoji-cell";
    cell.textContent = entry.emoji;

    const isUsed = room?.usedWords.includes(entry.word) ?? false;
    const isDeadEnd = !hasFollowUpEmoji(entry.word, room?.usedWords ?? []);
    const disabled = !isMyTurn || isUsed || isDeadEnd;

    if (disabled) {
      cell.classList.add("disabled");
      if (isUsed) {
        cell.title = "이미 사용된 단어입니다";
      } else if (isDeadEnd) {
        cell.title = "다음에 이어질 이모지가 없습니다";
      }
    } else {
      cell.onclick = () => {
        state.popupEmoji = entry.emoji;
        render();
      };
    }
    grid.appendChild(cell);
  }
  div.appendChild(grid);

  return div;
}

function renderDevWin(): HTMLElement {
  const div = document.createElement("div");
  div.className = "screen";
  const canForceWin = state.screen === "playing";

  div.innerHTML = `
    <div class="top-bar">
      <span></span>
      <button type="button" class="theme-toggle-btn" id="themeToggleBtn">
        ${state.theme === "dark" ? "☀️ 라이트 모드" : "🌙 다크 모드"}
      </button>
    </div>
    <h1>개발 전용 승리</h1>
    <p style="text-align:center;color:var(--text-muted);">
      별도 승리 상태가 아니라 기존 승리 처리 경로로 게임을 종료합니다.
    </p>
    ${canForceWin
      ? `<button type="button" id="devWinButton" ${devWinRequested ? "disabled" : ""}>
           ${devWinRequested ? "승리 처리 중..." : "기존 승리 처리로 종료"}
         </button>`
      : `<p style="text-align:center;">진행 중인 게임이 없습니다.</p>`}
    <a href="/" class="dev-link" id="devWinBackLink">게임으로 돌아가기</a>
    <footer class="attribution">
      이 페이지는 개발 환경에서만 사용할 수 있습니다.
    </footer>
  `;

  div.querySelector<HTMLButtonElement>("#themeToggleBtn")!.onclick = toggleTheme;

  const backButton = div.querySelector<HTMLAnchorElement>("#devWinBackLink");
  if (backButton) {
    backButton.onclick = (event) => {
      event.preventDefault();
      navigateTo("/");
    };
  }

  const devWinButton = div.querySelector<HTMLButtonElement>("#devWinButton");
  if (devWinButton) {
    devWinButton.onclick = requestDevWin;
  }

  if (canForceWin) requestDevWin();
  return div;
}

function hasFollowUpEmoji(word: string, usedWords: readonly string[] = []): boolean {
  const candidate = word.toUpperCase();
  const lastChar = candidate.slice(-1);
  const used = new Set(usedWords.map((usedWord) => usedWord.toUpperCase()));

  return getAllEmojis().some((entry) => {
    const nextWord = entry.word.toUpperCase();
    return (
      nextWord.charAt(0) === lastChar &&
      nextWord !== candidate &&
      !used.has(nextWord)
    );
  });
}

function renderPopup(emoji: string): HTMLElement {
  const overlay = document.createElement("div");
  overlay.className = "popup-overlay";
  const word = getWordFor(emoji) ?? "?";
  overlay.innerHTML = `
    <div class="popup-box">
      <div class="emoji-big">${emoji}</div>
      <div class="word">${word}</div>
      <div style="font-size:12px;color:#ff8a80;margin:4px 0 8px;">
        ⚠️ 규칙에 맞지 않는 이모지를 확정하면 즉시 탈락합니다!
      </div>
      <button id="confirmBtn">확정</button>
      <button id="cancelBtn" style="background:#555;">취소</button>
    </div>
  `;
  overlay.querySelector<HTMLButtonElement>("#confirmBtn")!.onclick = () => {
    socket.emit("emoji:submit", { emoji });
    state.popupEmoji = null;
    render();
  };
  overlay.querySelector<HTMLButtonElement>("#cancelBtn")!.onclick = () => {
    state.popupEmoji = null;
    render();
  };
  return overlay;
}

function renderToast(toast: ToastState): HTMLElement {
  const div = document.createElement("div");
  div.className = `toast ${toast.type || "error"}`;
  div.textContent = rejectReasonToText(toast.message);
  setTimeout(() => {
    if (state.toast?.message === toast.message) {
      state.toast = null;
      render();
    }
  }, 2000);
  return div;
}

function rejectReasonToText(reason: string): string {
  switch (reason) {
    case "NOT_YOUR_TURN": return "아직 당신의 턴이 아닙니다";
    case "GAME_NOT_PLAYING": return "지금은 게임이 진행 중이 아닙니다";
    case "WRONG_CHAIN": return "끝말잇기 조건에 맞지 않습니다";
    case "WORD_ALREADY_USED": return "이미 사용된 단어입니다";
    case "NO_FOLLOW_UP": return "이후에 이어질 이모지가 없습니다";
    case "UNKNOWN_EMOJI": return "알 수 없는 이모지입니다";
    case "TIME_OUT": return "시간이 초과되었습니다";
    case "ROOM_NOT_FOUND": return "방을 찾을 수 없습니다";
    case "ROOM_FULL": return "방이 가득 찼습니다";
    default: return reason;
  }
}

function renderGameOver(): HTMLElement {
  const div = document.createElement("div");
  div.className = "screen game-over-box";
  const result = state.lastGameOver;
  const won = result?.winnerId === state.myPlayerId;

  const icon = document.createElement("span");
  icon.className = `gameover-icon ${won ? "trophy" : "skull"}`;
  icon.textContent = won ? "🏆" : "💀";

  div.innerHTML = `
    <div class="top-bar">
      <span></span>
      <button type="button" class="theme-toggle-btn" id="themeToggleBtn">
        ${state.theme === "dark" ? "☀️ 라이트 모드" : "🌙 다크 모드"}
      </button>
    </div>
    <h1>${won ? "🎉 승리!" : "패배하셨습니다."}</h1>
  `;
  div.appendChild(icon);

  const reason = document.createElement("p");
  reason.style.cssText = "color:var(--text-muted);font-size:16px;margin:8px 0 0;";
  reason.textContent = gameOverReasonToText(result?.reason);
  div.appendChild(reason);

  const btns = document.createElement("div");
  btns.style.cssText = "display:flex;gap:12px;justify-content:center;margin-top:20px;";
  btns.innerHTML = `
    <button id="rematchBtn" style="flex:1;">재대결</button>
    <button id="leaveToLobbyBtn" class="secondary" style="flex:1;">로비로 나가기</button>
  `;
  div.appendChild(btns);

  const footer = document.createElement("footer");
  footer.className = "attribution";
  footer.innerHTML = `이모지 그래픽: <a href="https://twemoji.twitter.com/" target="_blank">Twemoji</a> (CC-BY 4.0)`;
  div.appendChild(footer);

  div.querySelector<HTMLButtonElement>("#themeToggleBtn")!.onclick = toggleTheme;
  div.querySelector<HTMLButtonElement>("#rematchBtn")!.onclick = () => {
    socket.emit("game:rematch");
  };
  div.querySelector<HTMLButtonElement>("#leaveToLobbyBtn")!.onclick = () => {
    socket.emit("room:leave");
    state.screen = "lobby";
    state.room = null;
    render();
  };
  return div;
}

function gameOverReasonToText(reason?: GameOverPayload["reason"]): string {
  switch (reason) {
    case "TIME_OUT": return "시간 초과";
    case "NO_VALID_MOVE": return "제출 가능한 이모지 없음";
    case "DISCONNECT": return "상대방 연결 끊김 (기권)";
    case "WRONG_CHAIN": return "끝말잇기 규칙에 맞지 않는 이모지 제출 (탈락)";
    case "WORD_ALREADY_USED": return "이미 사용된 이모지 제출 (탈락)";
    default: return "";
  }
}

function startTimerLoop() {
  if (timerInterval) window.clearInterval(timerInterval);
  timerInterval = window.setInterval(() => {
    const el = document.getElementById("timerText");
    if (!el || !timerEndTime) return;
    const remainMs = timerEndTime - Date.now();
    const remainSec = Math.max(0, Math.ceil(remainMs / 1000));
    el.textContent = `${remainSec}s`;
    el.classList.toggle("warn", remainSec <= 5);
  }, 250);
}

socket.on("room:state", (payload: RoomStatePayload) => {
  state.room = payload;
  if (state.screen === "waiting" && payload.status === "playing") {
    state.screen = "playing";
  }
  render();
});

socket.on("game:started", (_payload: GameStartedPayload) => {
  state.chainHistory = [];
  state.screen = "playing";
  render();
});

socket.on("turn:start", (payload: TurnStartPayload) => {
  timerEndTime = Date.now() + payload.durationMs;
  render();
  startTimerLoop();
});

socket.on("emoji:confirmed", (payload: EmojiConfirmedPayload) => {
  state.chainHistory.push(payload.emoji);
  render();
  const historyEls = document.querySelectorAll(".chain-history span");
  const lastEl = historyEls[historyEls.length - 1];
  lastEl?.classList.add("confirm-flash");
});

socket.on("emoji:rejected", (payload: EmojiRejectedPayload) => {
  showToast(payload.reason);
});

socket.on("game:over", (payload: GameOverPayload) => {
  state.lastGameOver = payload;
  state.screen = "gameover";
  devWinRequested = false;
  if (isDevWinRoute()) {
    window.history.replaceState({}, "", "/");
  }
   if (timerInterval) window.clearInterval(timerInterval);
  timerEndTime = 0;
  render();
});

window.addEventListener("popstate", render);

render();
