import os
import sqlite3
from contextlib import asynccontextmanager, closing
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, StringConstraints

DEFAULT_DATABASE_PATH = Path(__file__).resolve().parent.parent / "data" / "quicknotes.db"
MAX_BODY_LENGTH = 50000
MAX_QUERY_LENGTH = 200
MAX_NOTE_ID = 2**63 - 1  # SQLite INTEGER primary keys are signed 64-bit

NoteTitle = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


class NoteCreate(BaseModel):
    title: NoteTitle
    body: str = Field(default="", max_length=MAX_BODY_LENGTH)


class NoteUpdate(BaseModel):
    title: NoteTitle
    body: str = Field(max_length=MAX_BODY_LENGTH)


class Note(BaseModel):
    id: int
    title: str
    body: str
    created_at: str
    updated_at: str


def database_path() -> Path:
    return Path(os.environ.get("DATABASE_PATH") or DEFAULT_DATABASE_PATH)


def _icontains(haystack: str | None, needle: str | None) -> int:
    if haystack is None or needle is None:
        return 0
    return int(needle.casefold() in haystack.casefold())


def connect() -> sqlite3.Connection:
    path = database_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    # SQLite's LIKE only folds ASCII case, so search is done with Python's casefold().
    conn.create_function("icontains", 2, _icontains, deterministic=True)
    return conn


def init_db() -> None:
    with closing(connect()) as conn, conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                body TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def to_note(row: sqlite3.Row) -> Note:
    return Note(
        id=row["id"],
        title=row["title"],
        body=row["body"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def find_note(conn: sqlite3.Connection, note_id: int) -> sqlite3.Row | None:
    return conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()


def parse_note_id(raw: str) -> int:
    # Anything that cannot be a stored id is reported as a missing note, not a server error.
    if not (raw.isascii() and raw.isdigit()):
        raise HTTPException(status_code=404, detail="Note not found")
    try:
        note_id = int(raw)
    except ValueError:  # too many digits for Python's int conversion
        raise HTTPException(status_code=404, detail="Note not found")
    if not 0 < note_id <= MAX_NOTE_ID:
        raise HTTPException(status_code=404, detail="Note not found")
    return note_id


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="QuickNotes API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/notes", response_model=list[Note])
def list_notes(q: str | None = None) -> list[Note]:
    if q is not None and len(q) > MAX_QUERY_LENGTH:
        raise HTTPException(
            status_code=422,
            detail=f"Search text must be {MAX_QUERY_LENGTH} characters or fewer",
        )
    needle = (q or "").strip()
    with closing(connect()) as conn:
        if needle:
            rows = conn.execute(
                "SELECT * FROM notes WHERE icontains(title, ?) = 1 "
                "ORDER BY created_at DESC, id DESC",
                (needle,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM notes ORDER BY created_at DESC, id DESC"
            ).fetchall()
    return [to_note(row) for row in rows]


@app.post("/api/notes", response_model=Note, status_code=201)
def create_note(payload: NoteCreate) -> Note:
    now = utc_now()
    with closing(connect()) as conn, conn:
        cursor = conn.execute(
            "INSERT INTO notes (title, body, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (payload.title, payload.body, now, now),
        )
        row = find_note(conn, cursor.lastrowid)
    return to_note(row)


@app.get("/api/notes/{note_id}", response_model=Note)
def get_note(note_id: str) -> Note:
    key = parse_note_id(note_id)
    with closing(connect()) as conn:
        row = find_note(conn, key)
    if row is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return to_note(row)


@app.put("/api/notes/{note_id}", response_model=Note)
def update_note(note_id: str, payload: NoteUpdate) -> Note:
    key = parse_note_id(note_id)
    with closing(connect()) as conn, conn:
        cursor = conn.execute(
            "UPDATE notes SET title = ?, body = ?, updated_at = ? WHERE id = ?",
            (payload.title, payload.body, utc_now(), key),
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Note not found")
        row = find_note(conn, key)
    return to_note(row)


@app.delete("/api/notes/{note_id}", status_code=204)
def delete_note(note_id: str) -> Response:
    key = parse_note_id(note_id)
    with closing(connect()) as conn, conn:
        cursor = conn.execute("DELETE FROM notes WHERE id = ?", (key,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Note not found")
    return Response(status_code=204)
