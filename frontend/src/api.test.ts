import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createNote, deleteNote, listNotes } from "./api";

function jsonResponse(status: number, body?: unknown): Response {
  if (body === undefined) return new Response(null, { status });
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("api", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists notes with an encoded search query", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []));
    await listNotes("a & b");
    expect(fetchMock).toHaveBeenCalledWith("/api/notes?q=a%20%26%20b", expect.any(Object));
  });

  it("sends JSON bodies with a content type on create", async () => {
    const note = { id: 1, title: "T", body: "", created_at: "x", updated_at: "x" };
    fetchMock.mockResolvedValue(jsonResponse(201, note));
    const result = await createNote({ title: "T", body: "" });
    expect(result).toEqual(note);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ title: "T", body: "" }));
  });

  it("uses the detail field from error responses", async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { detail: "Note not found" }));
    await expect(deleteNote(99)).rejects.toThrow("Note not found");
  });

  it("falls back to a readable message when the error body is not JSON", async () => {
    fetchMock.mockResolvedValue(new Response("oops", { status: 500 }));
    await expect(listNotes()).rejects.toThrow("Request failed (500)");
  });

  it("returns undefined-safe results for 204 responses", async () => {
    fetchMock.mockResolvedValue(jsonResponse(204));
    await expect(deleteNote(1)).resolves.toBeUndefined();
  });
});
