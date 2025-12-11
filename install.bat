@echo off
echo Installing Photo Mosaic Application Dependencies...
echo.

echo Installing backend dependencies...
cd backend
call npm install
if errorlevel 1 (
    echo Backend installation failed!
    pause
    exit /b 1
)

echo.
echo Installing frontend dependencies...
cd ..\frontend
call npm install
if errorlevel 1 (
    echo Frontend installation failed!
    pause
    exit /b 1
)

cd ..
echo.
echo ========================================
echo Installation complete!
echo.
echo Run start.bat to launch the application.
echo ========================================
pause
