# 🐣 이모지 끝말잇기 (Emoji Word Chain)

이모지로 하는 실시간 멀티플레이 끝말잇기.

**🔗 플레이:** https://emoji-word-chain.onrender.com
> 무료 서버라 잠깐 접속이 없으면 잠들어요. 처음 들어가면 로딩에 몇십 초 걸릴 수 있습니다.

## 게임 방법

1. 닉네임 입력 후 방 만들기 (혼자 해보려면 "봇과 대결" 체크)
2. 카테고리에서 이모지를 골라 제출
3. 직전 이모지의 단어 끝 글자로 시작하는 단어의 이모지를 이어서 제출 (같은 이모지 재사용 불가)
4. 시간 안에 못 내거나 잘못된 단어를 내면 패배

2인 플레이는 링크로 접속해서 방장인 플레이어가 방 코드를 공유하면 됩니다.

## 기술 스택

Node.js · TypeScript · [Socket.io](https://socket.io/) (서버가 모든 판정을 직접 검증) · [Vite](https://vitejs.dev/)

## 개발 도구

개발 과정에서 Google **Gemini**와 Anthropic **Claude** AI, Kilo code를 활용했습니다.

## 출처 및 라이선스

- 이모지 ↔ 단어 데이터: [muan/unicode-emoji-json](https://github.com/muan/unicode-emoji-json) (MIT), 원본은 [Unicode CLDR](https://unicode.org/Public/emoji/)
- 이모지 그래픽: [Twemoji](https://github.com/twitter/twemoji) — 코드 MIT, 그래픽 [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/) (Twitter, Inc.)
