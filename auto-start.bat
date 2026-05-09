@echo off
cd /d "%~dp0"

for /f %%d in ('node -e "const d=new Date(Date.now()+4*3600000).getUTCDay();process.stdout.write(String(d))"') do set DOW=%%d

if "%DOW%"=="1" goto START
if "%DOW%"=="2" goto START
if "%DOW%"=="4" goto START
if "%DOW%"=="6" goto START
exit

:START
for /f %%r in ('node -e "const fs=require('fs');const d=new Date(Date.now()+4*3600000).toISOString().slice(0,10);const has=fs.existsSync('posts')&&fs.readdirSync('posts').some(f=>f.startsWith(d));process.stdout.write(has?'1':'0')"') do set PUBLISHED=%%r
if "%PUBLISHED%"=="1" exit

start "" /min cmd /c "node scripts/generate-news.js --auto-publish"
timeout /t 3 /nobreak > nul
start "" /min cmd /c "node admin.js"
timeout /t 5 /nobreak > nul
start "" "http://localhost:3001"
