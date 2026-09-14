#!/bin/bash
# emoji-word-chain 로컬 테스트용: 서버 + 클라이언트 동시 실행
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "[setup] 루트 node_modules 없음 - npm install 실행중..."
  npm install
fi

trap 'kill 0' EXIT
(cd server && npm run dev) &
(cd client && npm run dev) &
wait
