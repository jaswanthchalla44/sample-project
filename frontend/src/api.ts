export interface Note {
  id: number;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface NoteInput {
  title: string;
  body: string;
}

export const API_BASE: string = import.meta.env.VITE_API_BASE_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T | undefined> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new Error("Could not reach the server. Check your connection and try again.");
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data: unknown = await response.json();
      if (data && typeof data === "object" && "detail" in data) {
        const detail = (data as { detail: unknown }).detail;
        if (typeof detail === "string") {
          message = detail;
        } else if (Array.isArray(detail) && detail.length > 0) {
          const first = detail[0] as { msg?: unknown };
          if (typeof first?.msg === "string") message = first.msg;
        }
      }
    } catch {
      // Body was not JSON; keep the generic message.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined;
  }
  return (await response.json()) as T;
}

export function listNotes(q?: string): Promise<Note[]> {
  const query = q && q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
  return request<Note[]>(`/api/notes${query}`).then((notes) => notes ?? []);
}

export async function getNote(id: number): Promise<Note> {
  const note = await request<Note>(`/api/notes/${id}`);
  if (!note) throw new Error("Note not found");
  return note;
}

export async function createNote(input: NoteInput): Promise<Note> {
  const note = await request<Note>("/api/notes", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!note) throw new Error("Could not create the note");
  return note;
}

export async function updateNote(id: number, input: NoteInput): Promise<Note> {
  const note = await request<Note>(`/api/notes/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  if (!note) throw new Error("Could not save the note");
  return note;
}

export async function deleteNote(id: number): Promise<void> {
  await request<void>(`/api/notes/${id}`, { method: "DELETE" });
}
