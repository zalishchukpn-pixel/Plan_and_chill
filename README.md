# Plan & Chill

A day planner with a Pomodoro-based task scheduling algorithm and SQLite database.

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
│       ├── auth.py         # Registration, login, email check, user-info
│       ├── tasks.py        # Save / load tasks
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

(Recommended) Create and activate a virtual environment:
```bash
   python -m venv .venv
```

2. Activate it:
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

## Running the App

Open two terminals in the project folder:

**Terminal 1 — backend:**
```bash
   cd Plan_and_chill/backend
```

```bash
uvicorn main:app --reload
```

**Terminal 2 — frontend:**
```bash
cd frontend
```
```bash
python -m http.server 5173
```

5. Open in your browser:
```bash
http://localhost:5173
```


Open in browser: **http://localhost:5173**


## Database

The `planner.db` file is created automatically on the first backend launch.


## How to View the Database

**Graphically** — [DB Browser for SQLite](https://sqlitebrowser.org) → open `planner.db`

**In the terminal:**
```bash
sqlite3 planner.db
SELECT * FROM users;
SELECT * FROM tasks;
.quit
```

**In VS Code** the **SQLite Viewer** extension is available for browsing the database file.

### Tables

**`users`** — user accounts
| Field    | Type | Description                 |
|----------|------|-----------------------------|
| name     | TEXT | Name (PRIMARY KEY)          |
| email    | TEXT | Email (unique)              |
| password | TEXT | Password                    |

**`tasks`** — tasks
| Field     | Type    | Description                          |
|-----------|---------|--------------------------------------|
| id        | TEXT    | Task ID (PRIMARY KEY)                |
| user_name | TEXT    | Username (foreign key to users)      |
| day       | INTEGER | Day of the month (1–31)              |
| data      | TEXT    | JSON with all task fields            |

### API Endpoints

| Method | URL                          | Description                          |
|--------|------------------------------|--------------------------------------|
| POST   | `/register`                  | Register a new user                  |
| POST   | `/login`                     | Verify email + password              |
| GET    | `/tasks/{user_name}`         | Load all tasks                       |
| POST   | `/tasks/save`                | Save tasks for a single day          |
| POST   | `/plan`                      | Generate a schedule (algorithm)      |



## Usage

1. **Login** — enter your name, email, and password. First login = automatic registration. Subsequent logins — authentication via email + password.
2. **Planner** — select a day using the arrows or switch to the month view.
3. **Add a task** — click «+ Add event or routine»:
   - **Routine** — fixed time (classes, sleep, etc.). Can be set to repeat daily or weekly.
   - **Event** — you can set the time manually or choose **Auto-schedule** (the algorithm finds a free slot between routines).
4. **Generate schedule** — after adding tasks, click «Generate schedule» — a timeline with blocks for the whole day will be displayed.
5. **Edit** — to modify the task list, click «Edit task list».
6. **Settings** — accessible via the left panel: change name, view personal data, configure Pomodoro timer settings.
