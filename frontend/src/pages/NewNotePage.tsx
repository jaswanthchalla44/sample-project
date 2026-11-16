import { useNavigate } from "react-router-dom";
import { createNote } from "../api";
import NoteForm from "../components/NoteForm";

export default function NewNotePage() {
  const navigate = useNavigate();

  return (
    <section>
      <h1>New note</h1>
      <NoteForm
        submitLabel="Save note"
        cancelTo="/notes"
        onSubmit={async (input) => {
          const note = await createNote(input);
          navigate(`/notes/${note.id}`);
        }}
      />
    </section>
  );
}
