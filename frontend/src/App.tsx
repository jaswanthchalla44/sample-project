import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import EditNotePage from "./pages/EditNotePage";
import HomePage from "./pages/HomePage";
import NewNotePage from "./pages/NewNotePage";
import NoteDetailPage from "./pages/NoteDetailPage";
import NotesListPage from "./pages/NotesListPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/notes" element={<NotesListPage />} />
        <Route path="/notes/new" element={<NewNotePage />} />
        <Route path="/notes/:id" element={<NoteDetailPage />} />
        <Route path="/notes/:id/edit" element={<EditNotePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}
