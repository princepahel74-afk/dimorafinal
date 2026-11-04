@echo off
REM DIMORA - start the backend (Windows). Opens on http://127.0.0.1:8000
cd /d "%~dp0backend"
if not exist .venv ( py -3 -m venv .venv || python -m venv .venv )
call .venv\Scripts\activate.bat
pip install -q -r requirements.txt
if not exist .env copy .env.example .env
start "" http://127.0.0.1:8000
python app.py
pause
