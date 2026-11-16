import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <section className="home">
      <h1>QuickNotes</h1>
      <p>
        QuickNotes is a small, personal place for your notes. Write in plain text or Markdown, come
        back to them any time, and find them by title.
      </p>
      <div className="home-actions">
        <Link to="/notes/new" className="button">
          New note
        </Link>
        <Link to="/notes" className="button button-secondary">
          View notes
        </Link>
      </div>
    </section>
  );
}
