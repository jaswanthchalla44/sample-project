# QuickNotes

QuickNotes is a small personal notes app. Notes have a title and a Markdown body. You can
create, read, edit, delete and search notes by title.

- **backend/**: FastAPI + SQLite
- **frontend/**: React + Vite + TypeScript

## Prerequisites

- Python 3.10+
- Node.js 20+ and npm

## Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The SQLite database is created on first run at `backend/data/quicknotes.db`. To use another
location, set `DATABASE_PATH`.

Run the tests (from `backend/`, with the venv active):

```bash
pytest
```

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. The Vite dev server proxies `/api` to the backend on
`http://127.0.0.1:8000`, so start the backend first.

Other frontend commands:

```bash
npm run build   # type-check (tsc) and production build into dist/
npm test        # Vitest unit and component tests
```

## API endpoints

All endpoints are under `/api/notes`.

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/notes?q=<text>` | — | 200, JSON array of notes, newest first. `q` matches titles, case-insensitive. |
| POST | `/api/notes` | `{"title": str, "body": str}` | 201, note |
| GET | `/api/notes/{id}` | — | 200, note; 404 if missing |
| PUT | `/api/notes/{id}` | `{"title": str, "body": str}` | 200, note; 404 if missing |
| DELETE | `/api/notes/{id}` | — | 204; 404 if missing |

A note looks like this:

```json
{
  "id": 1,
  "title": "Groceries",
  "body": "- milk\n- eggs",
  "created_at": "2026-11-16T09:30:00Z",
  "updated_at": "2026-11-16T09:30:00Z"
}
```

Validation: `title` is required, 1–200 characters after trimming. `body` is optional and up to
50,000 characters.

## Configuration

By default the frontend calls relative `/api/notes` paths, which the Vite proxy forwards to the
backend. To call a different API origin instead, create `frontend/.env.local`:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000
```

The backend must then allow the frontend's origin (CORS). Restart `npm run dev` after changing
this value.
