import re

import pytest

import app.main as main

ISO_UTC = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")


def make_note(client, title="Title", body="Body"):
    response = client.post("/api/notes", json={"title": title, "body": body})
    assert response.status_code == 201
    return response.json()


def use_timestamps(monkeypatch, *stamps):
    values = iter(stamps)
    monkeypatch.setattr(main, "utc_now", lambda: next(values))


# Ids outside the signed 64-bit range (or otherwise invalid) are simply missing notes.
INVALID_IDS = [
    "0",
    "-1",
    "abc",
    "1.5",
    "%20",
    "9223372036854775807",
    "9223372036854775808",
    "18446744073709551616",
    "1" + "0" * 5000,
]


@pytest.mark.parametrize("note_id", INVALID_IDS)
def test_get_invalid_or_out_of_range_id_returns_404(client, note_id):
    response = client.get(f"/api/notes/{note_id}")
    assert response.status_code == 404
    assert response.json() == {"detail": "Note not found"}


@pytest.mark.parametrize("note_id", INVALID_IDS)
def test_put_invalid_or_out_of_range_id_returns_404(client, note_id):
    response = client.put(f"/api/notes/{note_id}", json={"title": "x", "body": "y"})
    assert response.status_code == 404
    assert response.json() == {"detail": "Note not found"}


@pytest.mark.parametrize("note_id", INVALID_IDS)
def test_delete_invalid_or_out_of_range_id_returns_404(client, note_id):
    response = client.delete(f"/api/notes/{note_id}")
    assert response.status_code == 404
    assert response.json() == {"detail": "Note not found"}


# Create

def test_create_returns_201_and_note_fields(client):
    response = client.post("/api/notes", json={"title": "Groceries", "body": "milk"})

    assert response.status_code == 201
    note = response.json()
    assert set(note) == {"id", "title", "body", "created_at", "updated_at"}
    assert isinstance(note["id"], int)
    assert note["title"] == "Groceries"
    assert note["body"] == "milk"
    assert ISO_UTC.match(note["created_at"])
    assert note["created_at"] == note["updated_at"]


def test_create_trims_title(client):
    note = make_note(client, title="   Padded title  ")
    assert note["title"] == "Padded title"


def test_create_body_defaults_to_empty_string(client):
    response = client.post("/api/notes", json={"title": "No body"})
    assert response.status_code == 201
    assert response.json()["body"] == ""


def test_create_ignores_unknown_fields(client):
    response = client.post("/api/notes", json={"title": "x", "body": "y", "extra": 1})
    assert response.status_code == 201
    assert "extra" not in response.json()


# Get

def test_get_existing_note(client):
    created = make_note(client, title="Find me", body="here")
    response = client.get(f"/api/notes/{created['id']}")

    assert response.status_code == 200
    assert response.json() == created


def test_get_missing_note_returns_404(client):
    response = client.get("/api/notes/999")
    assert response.status_code == 404
    assert response.json() == {"detail": "Note not found"}


# Update

def test_update_changes_fields_and_updated_at(client, monkeypatch):
    use_timestamps(monkeypatch, "2026-11-16T09:00:00Z", "2026-11-16T10:00:00Z")
    created = make_note(client, title="Old", body="old body")

    response = client.put(
        f"/api/notes/{created['id']}", json={"title": "  New  ", "body": "new body"}
    )

    assert response.status_code == 200
    updated = response.json()
    assert updated["id"] == created["id"]
    assert updated["title"] == "New"
    assert updated["body"] == "new body"
    assert updated["created_at"] == "2026-11-16T09:00:00Z"
    assert updated["updated_at"] == "2026-11-16T10:00:00Z"


def test_update_missing_note_returns_404(client):
    response = client.put("/api/notes/999", json={"title": "x", "body": "y"})
    assert response.status_code == 404
    assert response.json() == {"detail": "Note not found"}


def test_update_requires_body(client):
    created = make_note(client)
    response = client.put(f"/api/notes/{created['id']}", json={"title": "x"})
    assert response.status_code == 422


# Delete

def test_delete_returns_204_with_no_body(client):
    created = make_note(client)
    response = client.delete(f"/api/notes/{created['id']}")

    assert response.status_code == 204
    assert response.content == b""
    assert client.get(f"/api/notes/{created['id']}").status_code == 404


def test_delete_missing_note_returns_404(client):
    response = client.delete("/api/notes/999")
    assert response.status_code == 404
    assert response.json() == {"detail": "Note not found"}


# List

def test_list_is_empty_bare_array(client):
    response = client.get("/api/notes")
    assert response.status_code == 200
    assert response.json() == []


def test_list_is_bare_array_newest_first(client, monkeypatch):
    use_timestamps(
        monkeypatch,
        "2026-11-16T09:00:00Z",
        "2026-11-16T09:05:00Z",
        "2026-11-16T09:10:00Z",
    )
    first = make_note(client, title="first")
    second = make_note(client, title="second")
    third = make_note(client, title="third")

    response = client.get("/api/notes")

    assert response.status_code == 200
    assert [n["id"] for n in response.json()] == [third["id"], second["id"], first["id"]]


def test_list_orders_same_second_notes_by_newest_id(client, monkeypatch):
    use_timestamps(monkeypatch, "2026-11-16T09:00:00Z", "2026-11-16T09:00:00Z")
    first = make_note(client, title="first")
    second = make_note(client, title="second")

    response = client.get("/api/notes")

    assert [n["id"] for n in response.json()] == [second["id"], first["id"]]


# Title validation

@pytest.mark.parametrize("title", ["", "   ", "\t\n", "x" * 201])
def test_invalid_titles_return_422(client, title):
    response = client.post("/api/notes", json={"title": title, "body": ""})
    assert response.status_code == 422


def test_missing_title_returns_422(client):
    response = client.post("/api/notes", json={"body": "no title"})
    assert response.status_code == 422


def test_non_string_title_returns_422(client):
    response = client.post("/api/notes", json={"title": 123, "body": ""})
    assert response.status_code == 422


def test_title_of_200_characters_is_accepted(client):
    note = make_note(client, title="x" * 200)
    assert len(note["title"]) == 200


def test_title_limit_is_applied_after_trimming(client):
    note = make_note(client, title="   " + "x" * 200 + "   ")
    assert note["title"] == "x" * 200


# Body validation

def test_body_of_50000_characters_is_accepted(client):
    note = make_note(client, body="b" * 50000)
    assert len(note["body"]) == 50000


def test_body_over_50000_characters_returns_422(client):
    response = client.post("/api/notes", json={"title": "t", "body": "b" * 50001})
    assert response.status_code == 422


# Search

def test_search_matches_title_case_insensitively(client):
    make_note(client, title="Team Meeting notes")
    make_note(client, title="Shopping list")

    response = client.get("/api/notes", params={"q": "MEET"})

    assert response.status_code == 200
    titles = [n["title"] for n in response.json()]
    assert titles == ["Team Meeting notes"]


def test_search_is_case_insensitive_for_non_ascii(client):
    make_note(client, title="École de musique")
    make_note(client, title="Other")

    response = client.get("/api/notes", params={"q": "éCOLE"})

    assert [n["title"] for n in response.json()] == ["École de musique"]


def test_search_ignores_body(client):
    make_note(client, title="Plain title", body="secret keyword inside body")

    response = client.get("/api/notes", params={"q": "keyword"})

    assert response.json() == []


def test_empty_or_missing_search_returns_all_notes(client):
    make_note(client, title="one")
    make_note(client, title="two")

    assert len(client.get("/api/notes").json()) == 2
    assert len(client.get("/api/notes", params={"q": ""}).json()) == 2
    assert len(client.get("/api/notes", params={"q": "   "}).json()) == 2


def test_search_with_no_match_returns_empty_array(client):
    make_note(client, title="hello")
    response = client.get("/api/notes", params={"q": "zzz"})
    assert response.status_code == 200
    assert response.json() == []


def test_search_text_of_200_characters_is_accepted(client):
    make_note(client, title="x" * 200)
    response = client.get("/api/notes", params={"q": "x" * 200})
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_search_text_over_200_characters_returns_422(client):
    make_note(client, title="hello")
    response = client.get("/api/notes", params={"q": "x" * 201})

    assert response.status_code == 422
    detail = response.json()["detail"]
    assert isinstance(detail, str)
    assert "200" in detail


def test_search_treats_like_wildcards_literally(client):
    make_note(client, title="100% done")
    make_note(client, title="other")

    response = client.get("/api/notes", params={"q": "%"})

    assert [n["title"] for n in response.json()] == ["100% done"]


# Storage

def test_database_is_created_at_configured_path(tmp_path, monkeypatch):
    db_path = tmp_path / "nested" / "dir" / "custom.db"
    monkeypatch.setenv("DATABASE_PATH", str(db_path))

    from fastapi.testclient import TestClient

    with TestClient(main.app) as client:
        make_note(client)

    assert db_path.exists()
