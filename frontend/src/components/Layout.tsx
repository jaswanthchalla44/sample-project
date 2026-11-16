import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="app">
      <header className="site-header">
        <Link to="/" className="brand">
          QuickNotes
        </Link>
        <nav className="site-nav">
          <Link to="/notes">Notes</Link>
          <Link to="/notes/new" className="button button-small">
            New note
          </Link>
        </nav>
      </header>
      <main className="site-main">{children}</main>
    </div>
  );
}
