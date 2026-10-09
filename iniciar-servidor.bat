@echo off
cd /d "%~dp0"
echo SGAD disponible en http://localhost:5500
py -m http.server 5500
pause
