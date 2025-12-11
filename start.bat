@echo off
echo Starting Photo Mosaic Application...
echo.

REM Start backend in a new window
echo Starting backend server...
start "Backend" cmd /k "cd backend && npm run dev"

REM Wait a moment for backend to start
timeout /t 3 /nobreak > nul

REM Start frontend in a new window
echo Starting frontend server...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers starting...
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5173
echo.
echo Close the terminal windows to stop the servers.
