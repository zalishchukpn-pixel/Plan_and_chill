import json
from database import get_db
from schemas import SaveTasksRequest
from fastapi import APIRouter

router = APIRouter()

@router.get("/tasks/{user_email}")
async def get_all_tasks(user_email: str):
    conn = get_db()
    rows = conn.execute(
        "SELECT day, data FROM tasks WHERE user_email = ?",
        (user_email,)
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

@router.post("/tasks/save")
async def save_tasks(req: SaveTasksRequest):
    conn = get_db()
    conn.execute(
        "DELETE FROM tasks WHERE user_email = ? AND day = ?",
        (req.user_email, req.day)
    )
    for task in req.tasks:
        conn.execute(
            "INSERT INTO tasks (id, user_email, day, data) VALUES (?, ?, ?, ?)",
            (task["id"], req.user_email, req.day, json.dumps(task))
        )
    conn.commit()
    conn.close()
    return {"ok": True}
