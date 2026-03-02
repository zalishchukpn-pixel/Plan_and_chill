import sqlite3

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
            day        TEXT NOT NULL,
            data       TEXT NOT NULL,
            PRIMARY KEY (id, user_name),
            FOREIGN KEY (user_name) REFERENCES users(name)
        );
    """)
    conn.commit()
    conn.close()
