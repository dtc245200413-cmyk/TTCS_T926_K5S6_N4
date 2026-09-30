@echo off
title Internal Recruitment Management System

echo ========================================================
echo  INTERNAL RECRUITMENT MANAGEMENT SYSTEM - SPRINT 1
echo ========================================================
echo.

REM Set directories
set ROOT_DIR=%~dp0
set BACKEND_DIR=%ROOT_DIR%backend
set FRONTEND_DIR=%ROOT_DIR%frontend

REM Pre-checks
if not exist "%BACKEND_DIR%" (
    echo [ERROR] Backend directory not found at: %BACKEND_DIR%
    echo Please make sure the 'backend' folder exists.
    pause
    exit /b 1
)

if not exist "%FRONTEND_DIR%" (
    echo [ERROR] Frontend directory not found at: %FRONTEND_DIR%
    echo Please make sure the 'frontend' folder exists.
    pause
    exit /b 1
)

echo [INFO] Project folders found.
echo.
echo ========================================================
echo  PLEASE ENSURE MYSQL IS RUNNING BEFORE PROCEEDING!
echo  Database required: internal_recruitment_system
echo ========================================================
echo.
echo Press any key to start the servers...
pause >nul

echo.
echo [1/3] Starting Backend API on Port 3000...
if not exist "%BACKEND_DIR%\node_modules" (
    echo [INFO] Backend node_modules not found. Installing dependencies...
    cmd /c "cd /d ""%BACKEND_DIR%"" && npm install"
)
start "Backend API" cmd /k "cd /d ""%BACKEND_DIR%"" && npm run dev"

echo [2/3] Starting Frontend React App on Port 5173...
if not exist "%FRONTEND_DIR%\node_modules" (
    echo [INFO] Frontend node_modules not found. Installing dependencies...
    cmd /c "cd /d ""%FRONTEND_DIR%"" && npm install"
)
start "Frontend React Vite" cmd /k "cd /d ""%FRONTEND_DIR%"" && npm run dev"

echo [3/3] Waiting for servers to initialize (5 seconds)...
timeout /t 5 /nobreak >nul

echo Opening Login Page in default browser...
start "" http://localhost:5173/login

echo.
echo ========================================================
echo  SYSTEM STARTED SUCCESSFULLY
echo ========================================================
echo  Link dang nhap Web:  http://localhost:5173/login
echo  Link kiem tra API:   http://localhost:3000/
echo  Database:            internal_recruitment_system
echo --------------------------------------------------------
echo  Tai khoan test (Admin):
echo  Email:    an.nguyen@company.com
echo  Password: 123456
echo ========================================================
echo.
echo Note: Do not close the two newly opened command windows 
echo if you want to keep the servers running.
echo.
pause
