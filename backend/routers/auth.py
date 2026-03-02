from fastapi import APIRouter, HTTPException
from database import get_db
from schemas import RegisterRequest, LoginRequest
import sqlite3
import bcrypt

router = APIRouter()

@router.post("/register")
async def register(req: RegisterRequest):
    conn = get_db()
    try:
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(req.password.encode('utf-8'), salt).decode('utf-8')
        conn.execute(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            (req.name, req.email, hashed)
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
        "SELECT name, password FROM users WHERE email = ?",
        (req.email,)
    ).fetchone()
    if not row or not bcrypt.checkpw(req.password.encode('utf-8'), row["password"].encode('utf-8')):
        conn.close()
        raise HTTPException(status_code=401, detail="Невірний пароль або email")
    conn.close()
    return {"ok": True, "name": row["name"]}

@router.get("/user-info/{user_name}")
async def user_info(user_name: str):
    conn = get_db()
    row = conn.execute(
        "SELECT email FROM users WHERE name = ?",
        (user_name,)
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Користувача не знайдено")
    return {"email": row["email"]}
