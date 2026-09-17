# 🐣 이모지 끝말잇기 (Emoji Word Chain)

이모지로 하는 실시간 멀티플레이 끝말잇기.

**🔗 플레이:** https://emoji-word-chain.onrender.com
> 무료 서버라 잠깐 접속이 없으면 잠들어요. 처음 들어가면 로딩에 몇십 초 걸릴 수 있습니다.

## 게임 방법

1. 닉네임을 입력하고 **방 만들기**를 누릅니다. 혼자 연습하려면 **봇과 대결**을 켭니다. 다른 사람과 플레이하려면 6자리 방 코드를 공유한 뒤, 상대가 **방 참가**로 들어오게 합니다.
2. 게임이 시작되면 서버가 첫 이모지와 단어를 정하며, 방장이 먼저 시작합니다. 이후 자기 차례에 카테고리에서 이모지를 하나 고르고 **확정**합니다.
3. 새로 고른 이모지의 단어 첫 글자는 직전 이모지 단어의 끝 글자와 같아야 합니다. 예를 들어 ‘사자’ 다음에는 ‘자’로 시작하는 단어를 내야 합니다.
4. 한 게임에서 같은 이모지와 단어는 다시 사용할 수 없습니다. 다음에 이어질 수 없는 이모지도 선택할 수 없습니다.
5. 차례마다 제한 시간이 있으며, 시간이 지날수록 제한 시간이 짧아집니다. 시간 초과, 잘못된 끝말잇기, 이미 사용한 이모지 제출 시 해당 플레이어가 패배하고 상대가 승리합니다.

2인 플레이는 링크로 접속해서 방장인 플레이어가 방 코드를 공유하면 됩니다.

## 기술 스택

Node.js · TypeScript · [Socket.io](https://socket.io/) (서버가 모든 판정을 직접 검증) · [Vite](https://vitejs.dev/)

## 개발 도구

개발 과정에서 Google **Gemini**와 Anthropic **Claude** AI, Kilo code를 활용했습니다.

## 출처 및 라이선스

- 이모지 ↔ 단어 데이터: [muan/unicode-emoji-json](https://github.com/muan/unicode-emoji-json) (MIT), 원본은 [Unicode CLDR](https://unicode.org/Public/emoji/)
- 이모지 그래픽: [Twemoji](https://github.com/twitter/twemoji) — 코드 MIT, 그래픽 [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/) (Twitter, Inc.)
