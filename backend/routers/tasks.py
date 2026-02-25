import json
from database import get_db
from schemas import SaveTasksRequest
from fastapi import APIRouter

router = APIRouter()

@router.get("/tasks/{user_name}")
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

@router.post("/tasks/save")
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

@router.delete("/tasks/{user_name}/{day}/{task_id}")
async def delete_task(user_name: str, day: int, task_id: str):
    conn = get_db()
    conn.execute(
        "DELETE FROM tasks WHERE user_name = ? AND day = ? AND id = ?",
        (user_name, day, task_id)
    )
    conn.commit()
    conn.close()
    return {"ok": True}
