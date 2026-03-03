# Plan & Chill
<img width="1889" height="845" alt="image" src="https://github.com/user-attachments/assets/e66fb1cd-bbee-42a8-9b20-c0b644845df6" />


Day planner with a task scheduling algorithm based on Pomodoro.

Link to our web-app (temporary): http://142.93.107.164/

## Project Structure

```
Plan_and_chill/
├── frontend/
│   ├── index.html          # Login / registration page
│   ├── planner.html        # Main planner page
│   ├── settings.html       # Account settings
│   ├── css/
│   │   └── global.css      # All project styles
│   └── js/
│       ├── utils.js        # Shared utilities: API, sidebar, helpers
│       ├── index.js        # Login and registration logic
│       ├── planner.js      # Planner logic (day/month, timeline, form)
│       └── settings.js     # Account and Pomodoro settings
│
├── backend/
│   ├── main.py             # FastAPI entry point
│   ├── database.py         # SQLite: connection and table initialization
│   ├── schemas.py          # Pydantic models
│   ├── utils.py            # Pomodoro algorithm and Event / Routine / Day classes
│   └── routers/
│       ├── auth.py         # Registration, login, email verification, user-info
│       ├── tasks.py        # Saving / loading tasks
│       └── plan.py         # Schedule generation
│
├── requirements.txt
└── README.md
```

## Installation

1. Clone the repository:

```bash
   git clone https://github.com/zalishchukpn-pixel/Plan_and_chill.git
```
```bash
   cd Plan_and_chill
```

2. (Recommended) Create and activate a virtual environment:
```bash
   python -m venv .venv
```

Activate it:
```bash
   # Windows
   .venv\Scripts\activate

   # macOS / Linux
   source .venv/bin/activate
```

3. Install dependencies:
```bash
   pip install -r requirements.txt
```

## Running

Open two terminals in the project folder:

**Terminal 1 — backend:**
```bash
   cd Plan_and_chill
```
```bash
   cd backend
```
```bash
   python -m uvicorn main:app --reload
```

**Terminal 2 — frontend:**
```bash
   cd Plan_and_chill
```
```bash
   cd frontend
```
```bash
   python -m http.server 5173
```

5. Open in browser:
```bash
   http://localhost:5173
```

Open your browser: **http://localhost:5173**

## Database

The `planner.db` file is created automatically on the first backend launch.

## How to View the Database

**In the terminal:**
```bash
   sqlite3 planner.db
   SELECT * FROM users;
   SELECT * FROM tasks;
   .quit
```

**In VS Code** the **SQLite Viewer** extension is available for viewing the database file.

### Tables

**`users`** — user accounts
| Field    | Type | Description                  |
|----------|------|------------------------------|
| name     | TEXT | Name (PRIMARY KEY)           |
| email    | TEXT | Email (unique)               |
| password | TEXT | Password                     |

**`tasks`** — tasks
| Field      | Type    | Description                          |
|------------|---------|--------------------------------------|
| id         | TEXT    | Task ID (PRIMARY KEY)                |
| user_email | TEXT    | User email (relation to users)       |
| day        | INTEGER | Day of the month (1–31)              |
| data       | TEXT    | JSON with all task fields            |

## Usage

1. **Login** — enter your name, email, and password. First login = automatic registration. Subsequent logins — authentication by email + password.
2. **Planner** — choose a day using the arrows or switch to month view.
3. **Add a task** — click "+ Add event or routine":
   - **Routine** — fixed time (classes, sleep, etc.). Can be set to repeat: daily or weekly.
   - **Event** — time can be set manually or choose **Auto-select** (the algorithm will find a free slot between routines).
4. **Schedule generation** — after adding tasks, click "Generate schedule" — a timeline with blocks for the entire day will be displayed.
5. **Editing** — to change the list, click "Edit task list".
6. **Settings** — via the left panel: change name, view personal data, configure Pomodoro time.