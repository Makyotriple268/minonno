@echo off
setlocal
cd /d "%~dp0"
set /p NAME=File name of the video to render (e.g. ancient_humans):
python explainer.py render "videos\%NAME%.json"
pause
