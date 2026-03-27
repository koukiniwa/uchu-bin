@echo off
start wt wsl bash -c "cd '/mnt/c/Users/kouki/OneDrive/デスクトップ/uchu-bin' && npm run dev; exec bash"
timeout /t 18 /nobreak > nul
start http://localhost:3000
