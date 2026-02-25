"""Back-end module for our web-app with SQLite"""

import sqlite3
import json
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    conn = sqlite3.connect("planner.db")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            name      TEXT PRIMARY KEY,
            email     TEXT NOT NULL UNIQUE,
            password  TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tasks (
            id         TEXT NOT NULL,
            user_name  TEXT NOT NULL,
            day        INTEGER NOT NULL,
            data       TEXT NOT NULL,
            PRIMARY KEY (id, user_name),
            FOREIGN KEY (user_name) REFERENCES users(name)
        );
    """)
    conn.commit()
    conn.close()

init_db()


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class SaveTasksRequest(BaseModel):
    user_name: str
    day: int
    tasks: list

class TaskSchema(BaseModel):
    id: str
    text: str
    type: str
    startTime: Optional[int] = None
    endTime: Optional[int] = None
    duration: Optional[int] = None
    priority: Optional[int] = None
    eventMode: Optional[str] = None
    unplaced: Optional[bool] = False

class PlanRequest(BaseModel):
    tasks: List[TaskSchema]
    pomodoro_work: int
    pomodoro_break: int
    is_today: bool

#endpoints

@app.post("/register")
async def register(req: RegisterRequest):
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            (req.name, req.email, req.password)
        )
        conn.commit()
        return {"ok": True, "name": req.name}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Користувач з таким email вже існує")
    finally:
        conn.close()

@app.get("/check-email/{email}")
async def check_email(email: str):
    conn = get_db()
    user = conn.execute("SELECT name FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()
    return {"exists": user is not None}

@app.post("/login")
async def login(req: LoginRequest):
    conn = get_db()
    row = conn.execute(
        "SELECT name FROM users WHERE email = ? AND password = ?",
        (req.email, req.password)
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=401, detail="Невірний пароль або email")
    return {"ok": True, "name": row["name"]}

# tasks endpoints

@app.get("/tasks/{user_name}")
async def get_all_tasks(user_name: str):
    conn = get_db()
    rows = conn.execute(
        "SELECT day, data FROM tasks WHERE user_name = ?",
        (user_name,)
    ).fetchall()
    conn.close()

    day_tasks = {}
    for row in rows:
        day = str(row["day"])
        task = json.loads(row["data"])
        if day not in day_tasks:
            day_tasks[day] = []
        day_tasks[day].append(task)

    return day_tasks

@app.post("/tasks/save")
async def save_tasks(req: SaveTasksRequest):
    conn = get_db()
    # Delete all tasks for this user+day
    conn.execute(
        "DELETE FROM tasks WHERE user_name = ? AND day = ?",
        (req.user_name, req.day)
    )
    for task in req.tasks:
        conn.execute(
            "INSERT INTO tasks (id, user_name, day, data) VALUES (?, ?, ?, ?)",
            (task["id"], req.user_name, req.day, json.dumps(task))
        )
    conn.commit()
    conn.close()
    return {"ok": True}

@app.delete("/tasks/{user_name}/{day}/{task_id}")
async def delete_task(user_name: str, day: int, task_id: str):
    conn = get_db()
    conn.execute(
        "DELETE FROM tasks WHERE user_name = ? AND day = ? AND id = ?",
        (user_name, day, task_id)
    )
    conn.commit()
    conn.close()
    return {"ok": True}

#algorithm

class Event:
    def __init__(self, name, priority, time_to_spend):
        self.name = name
        self.priority = priority
        actual_time = max(30, int(time_to_spend))
        self.time_to_spend = round_to_5(actual_time)

class Routine:
    def __init__(self, name, time_start, time_finish, frequency=None):
        self.name = name
        self.time_start = time_start
        self.time_finish = time_finish
        self.frequency = frequency

class Day:
    def __init__(self, date):
        self.date = date
        self.priority_queue = []
        self.fixed_schedule = []

    def add_event(self, data):
        if isinstance(data, Event):
            self.priority_queue.append(data)
            return {"status": "added_to_queue"}
        if isinstance(data, Routine):
            for a in self.fixed_schedule:
                if (a.time_start < data.time_start < a.time_finish or
                        data.time_start < a.time_start < data.time_finish):
                    return 'Накладка в розкладі.'
            self.fixed_schedule.append(data)
            return {"status": "added_to_calendar"}
        raise TypeError("Wrong data type")

def round_to_5(minutes):
    return round(minutes / 5) * 5

def get_current_time_minutes():
    now = datetime.now()
    return now.hour * 60 + now.minute

def algorithm(pomodoro, day: Day, is_today: bool):
    work, w_break = pomodoro
    schedule = sorted(day.fixed_schedule, key=lambda x: x.time_start)
    events = sorted(day.priority_queue, key=lambda x: x.priority)
    current_time = get_current_time_minutes() if is_today else 480
    result_schedule = []

    for r in schedule:
        result_schedule.append({
            "id": getattr(r, 'id', f"routine-{r.time_start}"),
            "text": r.name,
            "type": "routine",
            "startTime": r.time_start,
            "endTime": r.time_finish
        })

    for ev in events:
        time_left = getattr(ev, 'time_to_spend', 60)
        while time_left > 0 and current_time < 1440:
            conflict = False
            for r in schedule:
                if r.time_start <= current_time < r.time_finish:
                    current_time = r.time_finish
                    conflict = True
                    break
            if conflict:
                continue
            next_routine = next((r for r in schedule if r.time_start >= current_time), None)
            available_time = (next_routine.time_start - current_time) if next_routine else (1440 - current_time)
            if available_time < work:
                if next_routine:
                    current_time = next_routine.time_finish
                    continue
                else:
                    break
            time_to_work = min(work, time_left)
            result_schedule.append({
                "id": f"auto-{current_time}",
                "text": ev.name + (" (Помодоро)" if getattr(ev, 'original_time', time_left) > work else ""),
                "type": "event",
                "isAuto": True,
                "startTime": current_time,
                "endTime": current_time + time_to_work
            })
            time_left -= time_to_work
            current_time += time_to_work + w_break

    return result_schedule

def mins_to_time(mins):
    h = (mins // 60) % 24
    m = mins % 60
    return f"{h:02d}:{m:02d}"

@app.post("/plan")
async def create_plan(request: PlanRequest):
    current_day = Day(date="today")
    for task in request.tasks:
        if task.type == 'routine' or (task.type == 'event' and task.eventMode == 'manual'):
            r = Routine(task.text, task.startTime or 0, task.endTime or 0)
            r.id = task.id
            current_day.add_event(r)
        else:
            e = Event(task.text, task.priority or 5, task.duration or 60)
            e.id = task.id
            e.original_time = e.time_to_spend
            current_day.add_event(e)

    pomodoro_tuple = (request.pomodoro_work, request.pomodoro_break)
    raw_schedule = algorithm(pomodoro_tuple, current_day, request.is_today)

    final_schedule = []
    for item in raw_schedule:
        item["startTime"] = mins_to_time(item["startTime"])
        item["endTime"] = mins_to_time(item["endTime"])
        final_schedule.append(item)

    final_schedule.sort(key=lambda x: x.get('startTime', '99:99'))
    return {"schedule": final_schedule}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
