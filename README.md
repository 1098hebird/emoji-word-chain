# 이모지 끝말잇기 (Emoji Word Chain)

## 실행 방법 (로컬)

이 환경에는 네트워크가 막혀 있어 `npm install`을 직접 실행/검증하지 못했습니다.
아래는 본인 로컬 환경에서 실행하는 방법입니다.

```bash
# 서버
cd server
npm install
npm run dev        # http://localhost:3001 에서 Socket.io 서버 실행

# 클라이언트 (새 터미널)
cd client
npm install
npm run dev         # http://localhost:5173 에서 Vite 개발 서버 실행
```

두 개를 동시에 켜고 브라우저에서 `http://localhost:5173` 접속.
"봇과 대결" 체크 후 방 만들기 → 바로 혼자 테스트 플레이 가능.
2인 테스트는 브라우저 탭 2개(또는 시크릿 창)로 각각 접속해 방 코드 공유.

## 현재 구현된 범위 (기획서 13번 기준)

- [x] 1~7단계: 기본 화면, 이모지 데이터 구조, Twemoji는 아직 미적용(텍스트 이모지로 렌더링 중), 카테고리 UI, 단어 팝업, 끝말잇기 판정, 턴 타이머
- [x] 8~10단계: 방/멀티플레이, 서버 authoritative 판정, 확정 이벤트 브로드캐스트
- [x] 봇전 (테스트용, 단순 랜덤)
- [ ] 11단계: 이모지별 고유 확정 연출 — 현재는 공통 pulse 애니메이션만 적용된 placeholder
- [ ] 12단계: 밸런스/모바일 터치 최적화
- [ ] 13단계: 배포

## 이모지 ↔ 단어 매핑

Unicode CLDR 공식 이모지 이름(`muan/unicode-emoji-json` 데이터 기준)을 기반으로 자동 생성합니다.

**출처**: [muan/unicode-emoji-json](https://github.com/muan/unicode-emoji-json) (MIT License), 원본은 [unicode.org](https://unicode.org/Public/emoji/) 의 CLDR 공식 데이터입니다.

- 규칙: CLDR 이름을 대문자화 + 공백/기호 제거 (예: "red apple" → `REDAPPLE`)
- 예외: Flags 카테고리는 공식 이름에 "flag: " 접두어가 붙어 있어(예: "flag: South Korea") 게임에 부적합하므로, `word`를 직접 나라 이름으로 지정 (예: `KOREA`)
- 구현: `server/src/data/emojiData.ts` / `client/src/data/emojiData.ts` 의 `nameToWord()` — 두 파일이 동일한 규칙을 유지해야 하므로, 규칙을 바꿀 경우 양쪽 다 수정 필요
- 카테고리당 6~16개만 채워진 상태이며 (전체 CLDR 데이터셋은 1,800개 이상이라 전부 넣진 않았습니다), 필요하면 `shared-emoji-data.json`에 `{ "emoji": "...", "cldrName": "..." }` 형태로 추가하면 됨
- 서버가 로드 시 같은 단어가 서로 다른 이모지에 중복 배정되면 콘솔에 경고를 출력합니다 (재사용 금지 규칙과 충돌 방지)

## 알려진 미확정/placeholder 항목

- 8개 카테고리 이름은 확정됨. 각 카테고리 안의 전체 이모지 목록은 여전히 일부만 채워진 상태 (카테고리당 6~16개)
- 턴별 시간표 → `server/src/game/room.ts` 상단 `START_TURN_MS` / `TURN_DECREASE_MS` / `MIN_TURN_MS` 는 임시값
- 이모지별 고유 확정 연출 → 현재는 모든 이모지가 동일한 pulse 효과만 사용
- Twemoji 실제 렌더링 → 현재는 브라우저 기본 이모지 폰트로 표시, Twemoji 스크립트 연동은 다음 단계에서 추가 예정

## 구조

```
server/   Node + TypeScript + Socket.io (게임 상태/판정 authoritative)
client/   Vite + TypeScript (UI, 소켓 이벤트 수신)
shared-emoji-data.json   더미 이모지/카테고리 데이터 원본 (server, client 양쪽에 복사됨)
```
