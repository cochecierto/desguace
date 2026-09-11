@echo off
chcp 65001 >nul
title DESGUACE - Sistema Operativo CAT

echo ===================================================
echo  DESGUACE · Centro de Control y Recepción CAT
echo  Subdominio de producción: https://desguace.cochecierto.com/
echo ===================================================
echo.
echo Iniciando servidor PHP local con API y persistencia en http://localhost:8000...
echo Panel de Operaciones: http://localhost:8000/operaciones.html
echo Web Pública:        http://localhost:8000/index.html
echo Acceso Operador:    admin@desguace.com / Desguace2026!
echo.
echo Presiona Ctrl+C para detener el servidor.
echo.

start "" "http://localhost:8000"
php -S localhost:8000 -t "%~dp0"
pause
