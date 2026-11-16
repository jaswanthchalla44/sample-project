import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listNotes, type Note } from "../api";
import { formatDate, previewText } from "../utils/text";

const SEARCH_DEBOUNCE_MS = 250;

export default function NotesListPage() {
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      listNotes(query)
        .then((result) => {
          if (cancelled) return;
          setNotes(result);
          setError(null);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : "Could not load notes.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <section>
      <div className="page-header">
        <h1>Notes</h1>
        <Link to="/notes/new" className="button">
          New note
        </Link>
      </div>

      <label className="field">
        <span className="visually-hidden">Search notes by title</span>
        <input
          type="search"
          placeholder="Search by title"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      {loading && <p className="status">Loading notes…</p>}
      {!loading && error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && notes.length === 0 && (
        <p className="status">
          {query.trim() ? "No notes match your search." : "No notes yet. Create your first one."}
        </p>
      )}

      {!error && notes.length > 0 && (
        <ul className="note-list">
          {notes.map((note) => (
            <li key={note.id} className="note-card">
              <Link to={`/notes/${note.id}`} className="note-card-title">
                {note.title}
              </Link>
              <p className="note-card-preview">{previewText(note.body) || "No content"}</p>
              <time dateTime={note.created_at}>{formatDate(note.created_at)}</time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
