import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { NoteInput } from "../api";

interface NoteFormProps {
  initial?: NoteInput;
  submitLabel: string;
  cancelTo: string;
  onSubmit: (input: NoteInput) => Promise<void>;
}

export default function NoteForm({ initial, submitLabel, cancelTo, onSubmit }: NoteFormProps) {
  const navigate = useNavigate();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const trimmed = title.trim();
    if (!trimmed) {
      setError("Please enter a title.");
      return;
    }
    if (trimmed.length > 200) {
      setError("The title must be 200 characters or fewer.");
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await onSubmit({ title: trimmed, body });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  return (
    <form className="note-form" onSubmit={handleSubmit} noValidate>
      <label className="field">
        <span>Title</span>
        <input
          type="text"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-invalid={error ? true : undefined}
          autoFocus
        />
      </label>

      <label className="field">
        <span>Body (Markdown)</span>
        <textarea
          name="body"
          rows={14}
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </label>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="form-actions">
        <button type="submit" className="button" disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </button>
        <button type="button" className="button button-secondary" onClick={() => navigate(cancelTo)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
