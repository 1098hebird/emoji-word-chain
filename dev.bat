@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo  emoji-word-chain dev launcher
echo ==========================================

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm 을 찾을 수 없습니다. Node.js가 설치되어 있는지, PATH에 등록되어 있는지 확인하세요.
  pause
  exit /b 1
)

if not exist node_modules (
  echo [setup] 루트 node_modules 없음 - npm install 실행중...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install 실패. 위 로그를 확인하세요.
    pause
    exit /b 1
  )
)

echo [1/2] 서버 창 여는 중...
start "emoji-word-chain-server" cmd /k "cd /d "%~dp0server" && npm run dev"

echo [2/2] 클라이언트 창 여는 중...
start "emoji-word-chain-client" cmd /k "cd /d "%~dp0client" && npm run dev"

echo.
echo 서버(3001), 클라이언트(5173) 창 두 개가 새로 열렸어야 합니다.
echo 안 열렸다면 방금 이 창에 에러 메시지가 있는지 확인하세요.
echo.
pause
