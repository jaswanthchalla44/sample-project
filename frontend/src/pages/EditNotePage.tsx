import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getNote, updateNote, type Note } from "../api";
import NoteForm from "../components/NoteForm";

export default function EditNotePage() {
  const { id } = useParams();
  const noteId = Number(id);
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <section>
      <h1>Edit note</h1>
      <NoteForm
        initial={{ title: note.title, body: note.body }}
        submitLabel="Save changes"
        cancelTo={`/notes/${note.id}`}
        onSubmit={async (input) => {
          await updateNote(note.id, input);
          navigate(`/notes/${note.id}`);
        }}
      />
    </section>
  );
}
