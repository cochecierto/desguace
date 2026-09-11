@echo off
chcp 65001 >nul
title CocheCierto Desguaces - Servidor Local

echo ===================================================
echo  CocheCierto Desguaces · CAT Recepción Inteligente
echo  Subdominio de produccion: https://desguace.cochecierto.com/
echo ===================================================
echo.
echo Iniciando servidor local en http://localhost:8080...
echo Presiona Ctrl+C para detener el servidor.
echo.

start "" "http://localhost:8080"
python -m http.server 8080 --directory "%~dp0"
pause
