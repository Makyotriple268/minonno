@echo off
setlocal
cd /d "%~dp0"

rem ==== Settings: change these if you like ====
set SERIES=Damn Reincarnation
set FIRST=21
set LAST=81
rem ============================================

if not defined GEMINI_API_KEY (
  echo GEMINI_API_KEY is not set. See SETUP_WINDOWS.md, step 5.
  pause
  exit /b 1
)
if not exist videos mkdir videos

for /L %%N in (%FIRST%,1,%LAST%) do call :chapter %%N
echo.
echo All done! Your videos are in the "videos" folder.
pause
exit /b 0

:chapter
if exist "videos\Chapter %1.mp4" (
  echo Chapter %1 already done, skipping.
  exit /b 0
)
if not exist "chapters\Chapter %1.cbz" (
  echo chapters\Chapter %1.cbz not found, skipping.
  exit /b 0
)
echo.
echo ===== Chapter %1 =====
python manhwa_recap.py "chapters\Chapter %1.cbz" -o "videos\Chapter %1.mp4" --llm gemini --series "%SERIES%" --notes-file story_so_far.txt --fallback claude
if errorlevel 1 (
  echo.
  echo Chapter %1 failed. Fix the problem above, or just wait if Gemini's daily limit ran out,
  echo then double-click run_all.bat again. Finished chapters are skipped automatically.
  pause
  exit 1
)
rmdir /s /q "videos\Chapter %1_work"
exit /b 0
