@ECHO OFF
& "C:\Program Files\Git\bin\git.exe" add railpack.json
& "C:\Program Files\Git\bin\git.exe" commit -m "fix: switch railpack.json to steps format to use npm install instead of npm ci"
& "C:\Program Files\Git\bin\git.exe" push origin main

