"""Tests for the file-upload → tiktoken-review → admit/backlog pipeline."""

import io
import json

import pytest
from fastapi.testclient import TestClient

import main


@pytest.fixture
def client(tmp_path, monkeypatch):
    """Isolate the on-disk JSON lists so tests never touch real data."""
    monkeypatch.setattr(main, "EXTRA_VOCAB_PATH", str(tmp_path / "extra_vocab.json"))
    monkeypatch.setattr(main, "BPE_BACKLOG_PATH", str(tmp_path / "bpe_backlog.json"))
    # Minimal known vocab so most uploaded words are fresh candidates.
    monkeypatch.setattr(main, "word_to_id", {"<UNK>": 0, "<|endoftext|>": 1})
    return TestClient(main.app)


def _make_pdf(text: str) -> bytes:
    import fitz

    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), text)
    data = doc.tobytes()
    doc.close()
    return data


# ── Validation ──────────────────────────────────────────────

def test_rejects_unsupported_type(client):
    resp = client.post("/api/upload", files={"file": ("data.csv", b"a,b,c", "text/csv")})
    assert resp.status_code == 400
    assert "supported" in resp.json()["detail"].lower()


def test_rejects_oversize_file(client):
    big = b"x" * (main.MAX_UPLOAD_BYTES + 1)
    resp = client.post("/api/upload", files={"file": ("big.txt", big, "text/plain")})
    assert resp.status_code == 413


def test_rejects_empty_extraction(client):
    resp = client.post("/api/upload", files={"file": ("blank.txt", b"   \n\t ", "text/plain")})
    assert resp.status_code == 400


# ── tiktoken review rule ────────────────────────────────────

def test_recognizes_common_word():
    assert main._tiktoken_recognizes("hello") is True


def test_does_not_recognize_gibberish():
    assert main._tiktoken_recognizes("qwxzkjvbn") is False


# ── txt upload pipeline ─────────────────────────────────────

def test_txt_upload_partitions_candidates(client):
    content = "hello world qwxzkjvbn"
    resp = client.post("/api/upload", files={"file": ("doc.txt", content.encode(), "text/plain")})
    assert resp.status_code == 200
    body = resp.json()

    candidates = set(body["admitted"]) | set(body["rejected"])
    assert candidates == {"hello", "world", "qwxzkjvbn"}
    # Every admitted word is tiktoken-recognized; every rejected word is not.
    assert all(main._tiktoken_recognizes(w) for w in body["admitted"])
    assert all(not main._tiktoken_recognizes(w) for w in body["rejected"])
    assert "qwxzkjvbn" in body["rejected"]
    assert body["candidate_count"] == len(candidates)


# ── pdf upload pipeline ─────────────────────────────────────

def test_pdf_upload_extracts_text(client):
    pdf = _make_pdf("hello world qwxzkjvbn")
    resp = client.post("/api/upload", files={"file": ("doc.pdf", pdf, "application/pdf")})
    assert resp.status_code == 200
    body = resp.json()
    candidates = set(body["admitted"]) | set(body["rejected"])
    assert "hello" in candidates


# ── persistence round-trip ──────────────────────────────────

def test_admitted_token_persists_and_rebuilds(tmp_path, monkeypatch):
    # Point extras at an isolated file holding one admitted token, then rebuild.
    extra = tmp_path / "extra_vocab.json"
    extra.write_text(json.dumps(["xyzzytoken"]), encoding="utf-8")
    monkeypatch.setattr(main, "EXTRA_VOCAB_PATH", str(extra))
    try:
        main._build_vocab()
        assert "xyzzytoken" in main.word_to_id
    finally:
        # monkeypatch restores the real path on teardown; rebuild clean state.
        monkeypatch.undo()
        main._build_vocab()


def test_backlog_endpoint_returns_rejected(client):
    with open(main.BPE_BACKLOG_PATH, "w", encoding="utf-8") as f:
        json.dump(["qwxzkjvbn"], f)
    resp = client.get("/api/backlog")
    assert resp.status_code == 200
    assert resp.json()["words"] == ["qwxzkjvbn"]
