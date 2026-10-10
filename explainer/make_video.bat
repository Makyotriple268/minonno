@echo off
setlocal
cd /d "%~dp0"
if not defined GEMINI_API_KEY (
  echo GEMINI_API_KEY is not set. See README.md.
  pause
  exit /b 1
)
set /p TOPIC=Video topic (e.g. what did ancient humans do all day):
set /p NAME=Short file name for this video (e.g. ancient_humans):
set /p MINUTES=Length in minutes (e.g. 10):
if not exist videos mkdir videos
python explainer.py plan "%TOPIC%" -o "videos\%NAME%.json" --minutes %MINUTES%
if errorlevel 1 (pause & exit /b 1)
echo.
echo Next: make the images listed in videos\%NAME%_checklist.txt and put them in the library folder.
echo Then double-click render_video.bat.
pause
