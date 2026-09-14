# 🐣 이모지 끝말잇기 (Emoji Word Chain)

이모지로 하는 실시간 멀티플레이 끝말잇기. Socket.io로 서버가 판정을 내리는 authoritative 구조입니다.

**🔗 플레이:** https://emoji-word-chain.onrender.com
> 무료 플랜이라 15분 이상 접속이 없으면 서버가 잠들어요. 처음 들어가면 30초~1분 정도 로딩될 수 있습니다.

---

## 게임 방법

1. 닉네임 입력 후 방 만들기 (혼자 테스트하려면 "봇과 대결" 체크)
2. 카테고리에서 이모지를 골라 제출
3. 직전 이모지의 단어 끝 글자로 시작하는 단어의 이모지를 이어서 제출 (같은 이모지 재사용 불가)
4. 시간 안에 못 내거나 이미 나온 단어를 내면 패배

2인 테스트는 브라우저 탭 2개(또는 시크릿 창)로 각각 접속해서 방 코드를 공유하면 됩니다.

---

## 기술 스택

| 영역 | 구성 |
|---|---|
| 서버 | Node.js, TypeScript, [Socket.io](https://socket.io/) (게임 상태 authoritative 판정) |
| 클라이언트 | [Vite](https://vitejs.dev/), TypeScript |
| 배포 | [Render](https://render.com) (Web Service 1개, 빌드된 client를 서버가 같은 origin에서 정적 서빙) |

## 프로젝트 구조

```
server/   Node + TypeScript + Socket.io (게임 로직 / 서버 authoritative 판정)
client/   Vite + TypeScript (UI, 소켓 이벤트 수신)
server/src/data/emojiData.json   이모지 ↔ 단어 데이터 (client와 동일 파일 유지 필요)
client/src/data/emojiData.json
render.yaml   Render 배포 설정 (Blueprint)
```

---

## 로컬 실행

```bash
# 최초 1회
npm install
npm run install:all   # server, client 의존성 설치

# 개발 서버 실행 (server:3001 + client:5173 동시 실행)
npm run dev
```

브라우저에서 `http://localhost:5173` 접속.

## 배포 (Render, 무료)

1. GitHub에 저장소 push (`node_modules`는 `.gitignore`로 이미 제외됨)
2. [render.com](https://render.com) 가입 → GitHub 연동
3. **New +** → **Blueprint** → 저장소 선택 → `render.yaml`을 자동 인식 → **Apply**
4. 빌드가 끝나면 `npm run build`(client 빌드 + server 빌드)를 거쳐 `npm start`로 실행되고,
   서버가 `client/dist`를 같은 포트에서 정적 서빙하므로 별도 서버 분리 없이 링크 하나로 접속 가능

---

## 현재 구현 범위

- [x] 기본 화면, 이모지 데이터 구조, 카테고리 UI, 단어 팝업, 끝말잇기 판정, 턴 타이머
- [x] 방/멀티플레이, 서버 authoritative 판정, 확정 이벤트 브로드캐스트
- [x] 봇전 (테스트용, 단순 랜덤)
- [ ] 이모지별 고유 확정 연출 — 현재는 공통 pulse 애니메이션만 적용된 placeholder
- [x] Twemoji 실제 렌더링 — `twemoji.parse()`로 그래픽 이모지 표시, 화면 하단에 CC-BY 4.0 출처 고지 포함
- [ ] 밸런스/모바일 터치 최적화

턴별 시간표는 `server/src/game/room.ts`의 `START_TURN_MS` / `TURN_DECREASE_MS` / `MIN_TURN_MS`에서 조정 가능 (현재 임시값).

---

## 이모지 ↔ 단어 매핑

- 규칙: [Unicode CLDR](https://cldr.unicode.org/) 공식 이모지 이름을 대문자화 + 공백/기호 제거 (예: "red apple" → `REDAPPLE`)
- 예외: Flags 카테고리는 공식 이름에 "flag: " 접두어가 붙어 게임에 부적합하므로 `word`를 나라 이름으로 직접 지정 (예: `KOREA`)
- 구현: `server/src/data/emojiData.ts` / `client/src/data/emojiData.ts`의 `nameToWord()` — 두 파일이 동일한 규칙을 유지해야 하므로 규칙을 바꾸면 양쪽 다 수정 필요
- 서버가 로드 시 같은 단어가 서로 다른 이모지에 중복 배정되면 콘솔에 경고 출력 (재사용 금지 규칙과 충돌 방지)
- 카테고리당 6~16개만 채워진 상태 (전체 CLDR 데이터셋은 1,800개 이상). 추가하려면 `server/src/data/emojiData.json`과 `client/src/data/emojiData.json`에 **동일하게** `{ "emoji": "...", "cldrName": "..." }` 형태로 넣으면 됨 (또는 `word` 필드로 직접 지정해 자동 계산 규칙을 덮어쓸 수 있음)

---

## 출처 및 라이선스 (Attribution)

이 프로젝트는 아래 오픈소스/공개 데이터를 사용합니다. 각 항목의 라이선스 조건에 따라 출처를 표기합니다.

### 이모지 ↔ 단어 데이터
- 이모지 이름(CLDR name) 데이터는 [muan/unicode-emoji-json](https://github.com/muan/unicode-emoji-json)을 기반으로 가공했습니다.
  라이선스: MIT License, Copyright (c) 2018 Muan
- 원본 이모지 이름 데이터는 [Unicode CLDR](https://unicode.org/Public/emoji/) (Unicode, Inc.)에서 유래합니다.
  Unicode 데이터는 [Unicode License](https://www.unicode.org/license.txt)를 따르며, 이 프로젝트의 이모지-단어 매핑은 CLDR 이름을 규칙적으로 가공(대문자화·기호 제거)한 2차 저작물입니다.

### Twemoji
이모지 그래픽 렌더링에 `client/src/main.ts`의 `twemoji.parse()`로 실제 사용 중입니다.
- 코드: [twemoji](https://github.com/twitter/twemoji) — MIT License, Copyright (c) 2021 Twitter, Inc.
- 그래픽(이모지 이미지): Twemoji graphics — [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/), Copyright 2020 Twitter, Inc and other contributors
- CC-BY 4.0 조건에 따라 화면 하단(footer)에 "이모지 그래픽: Twemoji (CC-BY 4.0)" 출처 고지를 앱 내에 상시 표시하고 있습니다. **이 footer 문구는 지우지 마세요** — 지우면 라이선스 조건 위반이 됩니다.

### 그 외 라이브러리
Socket.io, Express, Vite, TypeScript 등은 각자의 오픈소스 라이선스(대부분 MIT)를 따르며, `node_modules`에 포함된 각 패키지의 `LICENSE` 파일을 참조하세요.

### 이 저장소의 코드
별도로 라이선스를 명시하지 않은 이 저장소 자체의 소스 코드(서버/클라이언트 로직 등)는 현재 별도 오픈소스 라이선스가 지정되어 있지 않습니다. 공개적으로 재사용을 허용하려면 `LICENSE` 파일을 추가해 명시하는 것을 권장합니다.
