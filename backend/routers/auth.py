from fastapi import APIRouter, HTTPException
from database import get_db
from schemas import RegisterRequest, LoginRequest
import sqlite3

router = APIRouter()

@router.post("/register")
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

@router.get("/check-email/{email}")
async def check_email(email: str):
    conn = get_db()
    user = conn.execute("SELECT name FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()
    return {"exists": user is not None}

@router.post("/login")
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

@router.get("/user-info/{user_name}")
async def user_info(user_name: str):
    conn = get_db()
    row = conn.execute(
        "SELECT email, password FROM users WHERE name = ?",
        (user_name,)
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Користувача не знайдено")
    return {"email": row["email"], "password": row["password"]}
