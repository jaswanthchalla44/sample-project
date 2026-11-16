import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { deleteNote, getNote, type Note } from "../api";
import { formatDate } from "../utils/text";

export default function NoteDetailPage() {
  const { id } = useParams();
  const noteId = Number(id);
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!Number.isInteger(noteId)) {
      setError("Note not found.");
      setLoading(false);
      return;
    }
    setLoading(true);
    getNote(noteId)
      .then((result) => {
        if (!cancelled) setNote(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load the note.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [noteId]);

  async function handleDelete() {
    if (!note) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteNote(note.id);
      navigate("/notes");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Could not delete the note.");
      setDeleting(false);
    }
  }

  if (loading) return <p className="status">Loading note…</p>;
  if (error || !note) {
    return (
      <section>
        <p className="error" role="alert">
          {error ?? "Note not found."}
        </p>
        <Link to="/notes">Back to notes</Link>
      </section>
    );
  }

  return (
    <article className="note-detail">
      <h1>{note.title}</h1>
      <p className="meta">
        Created <time dateTime={note.created_at}>{formatDate(note.created_at)}</time>
        <br />
        Updated <time dateTime={note.updated_at}>{formatDate(note.updated_at)}</time>
      </p>

      <div className="note-body markdown">
        {note.body.trim() ? <ReactMarkdown>{note.body}</ReactMarkdown> : <p className="status">This note is empty.</p>}
      </div>

      <div className="form-actions">
        <Link to={`/notes/${note.id}/edit`} className="button">
          Edit
        </Link>
        {!confirming && (
          <button type="button" className="button button-danger" onClick={() => setConfirming(true)}>
            Delete
          </button>
        )}
      </div>

      {confirming && (
        <div className="confirm" role="alertdialog" aria-labelledby="confirm-title">
          <p id="confirm-title">Delete this note? This cannot be undone.</p>
          <div className="form-actions">
            <button type="button" className="button button-danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Yes, delete"}
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setConfirming(false)}
              disabled={deleting}
            >
              Cancel
            </button>
          </div>
          {deleteError && (
            <p className="error" role="alert">
              {deleteError}
            </p>
          )}
        </div>
      )}
    </article>
  );
}
