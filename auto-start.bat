@echo off
cd /d "%~dp0"

rem 管理画面は毎日起動
start "" /min cmd /c "node admin.js"
timeout /t 3 /nobreak > nul
start "" "http://localhost:3001"

rem 記事生成は月・火・木・土のみ、かつ当日未公開の場合
for /f %%d in ('node -e "const d=new Date(Date.now()+9*3600000).getUTCDay();process.stdout.write(String(d))"') do set DOW=%%d
if "%DOW%"=="1" goto GENERATE
if "%DOW%"=="2" goto GENERATE
if "%DOW%"=="4" goto GENERATE
if "%DOW%"=="6" goto GENERATE
goto END

:GENERATE
for /f %%r in ('node -e "const fs=require('fs');const d=new Date(Date.now()+9*3600000).toISOString().slice(0,10);const has=fs.existsSync('posts')&&fs.readdirSync('posts').some(f=>f.startsWith(d));process.stdout.write(has?'1':'0')"') do set PUBLISHED=%%r
if "%PUBLISHED%"=="1" goto END
start "" /min cmd /c "node scripts/generate-news.js --auto-publish"

:END
