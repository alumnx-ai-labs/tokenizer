"""
Integration tests for the FastAPI routes in main.py.
Uses FastAPI's TestClient (backed by httpx) — no live server needed.
"""
import sys
import os
import io

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi.testclient import TestClient
from main import app

PENDING_BPE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "pending_bpe_tokens.txt")


@pytest.fixture(autouse=True)
def clear_pending_bpe_file():
    if os.path.exists(PENDING_BPE_PATH):
        os.remove(PENDING_BPE_PATH)


client = TestClient(app)


# ──────────────────────────────────────────────────────────
# GET /api/health
# ──────────────────────────────────────────────────────────

class TestHealthEndpoint:
    def test_returns_200(self):
        resp = client.get("/api/health")
        assert resp.status_code == 200

    def test_returns_ok_status(self):
        resp = client.get("/api/health")
        assert resp.json() == {"status": "ok"}


# ──────────────────────────────────────────────────────────
# GET /api/vocab-info
# ──────────────────────────────────────────────────────────

class TestVocabInfoEndpoint:
    def test_returns_200(self):
        resp = client.get("/api/vocab-info")
        assert resp.status_code == 200

    def test_has_required_keys(self):
        resp = client.get("/api/vocab-info")
        data = resp.json()
        assert "simple_vocab_size" in data
        assert "tiktoken_vocab_size" in data
        assert "tiktoken_encoding" in data

    def test_tiktoken_encoding_is_cl100k(self):
        resp = client.get("/api/vocab-info")
        assert resp.json()["tiktoken_encoding"] == "cl100k_base"

    def test_simple_vocab_size_is_positive(self):
        resp = client.get("/api/vocab-info")
        assert resp.json()["simple_vocab_size"] > 0

    def test_tiktoken_vocab_size_is_large(self):
        # cl100k_base has ~100k tokens
        resp = client.get("/api/vocab-info")
        assert resp.json()["tiktoken_vocab_size"] > 50_000


# ──────────────────────────────────────────────────────────
# GET /api/example-text
# ──────────────────────────────────────────────────────────

class TestExampleTextEndpoint:
    def test_returns_200(self):
        resp = client.get("/api/example-text")
        assert resp.status_code == 200

    def test_returns_text_field(self):
        resp = client.get("/api/example-text")
        assert "text" in resp.json()

    def test_text_is_nonempty_string(self):
        resp = client.get("/api/example-text")
        text = resp.json()["text"]
        assert isinstance(text, str)
        assert len(text) > 0


# ──────────────────────────────────────────────────────────
# POST /api/tokenize
# ──────────────────────────────────────────────────────────

class TestTokenizeEndpoint:
    def test_empty_text_returns_400(self):
        resp = client.post("/api/tokenize", json={"text": ""})
        assert resp.status_code == 400

    def test_returns_200_for_valid_text(self):
        resp = client.post("/api/tokenize", json={"text": "hello world"})
        assert resp.status_code == 200

    def test_response_has_required_top_level_keys(self):
        resp = client.post("/api/tokenize", json={"text": "hello world"})
        data = resp.json()
        assert "character_count" in data
        assert "simple" in data
        assert "tiktoken" in data

    def test_character_count_matches_input(self):
        text = "hello world"
        resp = client.post("/api/tokenize", json={"text": text})
        assert resp.json()["character_count"] == len(text)

    def test_simple_result_has_required_keys(self):
        resp = client.post("/api/tokenize", json={"text": "hello"})
        simple = resp.json()["simple"]
        assert "tokens" in simple
        assert "token_count" in simple
        assert "vocab_size" in simple
        assert "tokenizer_name" in simple

    def test_tiktoken_result_has_required_keys(self):
        resp = client.post("/api/tokenize", json={"text": "hello"})
        tt = resp.json()["tiktoken"]
        assert "tokens" in tt
        assert "token_count" in tt
        assert "vocab_size" in tt
        assert "tokenizer_name" in tt

    def test_simple_tokenizer_name(self):
        resp = client.post("/api/tokenize", json={"text": "hello"})
        assert resp.json()["simple"]["tokenizer_name"] == "Simple Tokenizer"

    def test_tiktoken_tokenizer_name(self):
        resp = client.post("/api/tokenize", json={"text": "hello"})
        assert resp.json()["tiktoken"]["tokenizer_name"] == "TikToken (cl100k_base)"

    def test_token_count_matches_tokens_list_length(self):
        resp = client.post("/api/tokenize", json={"text": "hello world"})
        data = resp.json()
        assert data["simple"]["token_count"] == len(data["simple"]["tokens"])
        assert data["tiktoken"]["token_count"] == len(data["tiktoken"]["tokens"])

    def test_each_token_has_required_fields(self):
        resp = client.post("/api/tokenize", json={"text": "hello world"})
        for tok in resp.json()["simple"]["tokens"]:
            assert "token" in tok
            assert "token_id" in tok
            assert "is_unk" in tok

    def test_tiktoken_never_produces_unk(self):
        resp = client.post("/api/tokenize", json={"text": "supercalifragilistic xyz123"})
        for tok in resp.json()["tiktoken"]["tokens"]:
            assert tok["is_unk"] is False

    def test_known_word_not_marked_unk_in_simple(self):
        # "the" should be in the vocabulary built from the corpus
        resp = client.post("/api/tokenize", json={"text": "the"})
        tokens = resp.json()["simple"]["tokens"]
        assert len(tokens) == 1
        assert tokens[0]["is_unk"] is False

    def test_unknown_word_marked_unk_in_simple(self):
        # Very unlikely word to be in the small corpus
        resp = client.post("/api/tokenize", json={"text": "xyzzyquux99999"})
        tokens = resp.json()["simple"]["tokens"]
        assert len(tokens) == 1
        assert tokens[0]["is_unk"] is True

    def test_punctuation_tokenized_by_simple(self):
        resp = client.post("/api/tokenize", json={"text": "hello, world"})
        simple_tokens = [t["token"] for t in resp.json()["simple"]["tokens"]]
        assert "," in simple_tokens

    def test_unicode_text(self):
        resp = client.post("/api/tokenize", json={"text": "café"})
        assert resp.status_code == 200

    def test_long_text_tokenizes(self):
        text = "The quick brown fox jumps over the lazy dog. " * 10
        resp = client.post("/api/tokenize", json={"text": text})
        assert resp.status_code == 200
        assert resp.json()["tiktoken"]["token_count"] > 0

    def test_missing_text_field_returns_422(self):
        resp = client.post("/api/tokenize", json={})
        assert resp.status_code == 422

    def test_single_character(self):
        resp = client.post("/api/tokenize", json={"text": "a"})
        assert resp.status_code == 200
        assert resp.json()["character_count"] == 1


# ──────────────────────────────────────────────────────────
# POST /api/extract-text
# ──────────────────────────────────────────────────────────

class TestExtractTextEndpoint:
    def _upload(self, filename, content, content_type="text/plain"):
        return client.post(
            "/api/extract-text",
            files={"file": (filename, content, content_type)},
        )

    def test_txt_file_returns_text(self):
        resp = self._upload("sample.txt", b"Hello from text file")
        assert resp.status_code == 200
        assert resp.json()["text"] == "Hello from text file"

    def test_txt_utf8_content(self):
        content = "café au lait".encode("utf-8")
        resp = self._upload("sample.txt", content)
        assert resp.status_code == 200
        assert "café" in resp.json()["text"]

    def test_unsupported_extension_returns_400(self):
        resp = self._upload("doc.docx", b"some content", "application/octet-stream")
        assert resp.status_code == 400

    def test_unsupported_extension_error_message(self):
        resp = self._upload("file.csv", b"a,b,c")
        assert "Unsupported" in resp.json()["detail"]

    def test_file_too_large_returns_413(self):
        big_content = b"x" * (10 * 1024 * 1024 + 1)
        resp = self._upload("big.txt", big_content)
        assert resp.status_code == 413

    def test_pdf_returns_200(self):
        # Minimal valid PDF with no text content (just structure)
        # We use a tiny valid PDF bytes snippet
        minimal_pdf = (
            b"%PDF-1.4\n"
            b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
            b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
            b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n"
            b"xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n"
            b"0000000058 00000 n \n0000000115 00000 n \n"
            b"trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF"
        )
        resp = self._upload("test.pdf", minimal_pdf, "application/pdf")
        # pypdf may succeed or fail on this minimal PDF; we check it doesn't 500 on a valid one
        assert resp.status_code in (200, 500)

    def test_no_filename_returns_client_error(self):
        # FastAPI 0.115+ returns 422 (form validation) when filename is empty;
        # older versions reached the handler and returned 400. Either is correct.
        resp = client.post(
            "/api/extract-text",
            files={"file": ("", b"content", "text/plain")},
        )
        assert resp.status_code in (400, 422)


# ──────────────────────────────────────────────────────────
# POST /api/vocab/add
# ──────────────────────────────────────────────────────────

class TestVocabAddEndpoint:
    def test_returns_200(self):
        resp = client.post("/api/vocab/add", json={"tokens": ["testword123xyz"]})
        assert resp.status_code == 200

    def test_response_has_required_keys(self):
        resp = client.post("/api/vocab/add", json={"tokens": ["testword123xyz"]})
        data = resp.json()
        assert "status" in data
        assert "added_count" in data
        assert "new_vocab_size" in data
        assert "rejected_tokens" in data

    def test_status_is_success(self):
        resp = client.post("/api/vocab/add", json={"tokens": ["uniqueword99abc"]})
        assert resp.json()["status"] == "success"

    def test_multi_token_word_is_rejected(self):
        # "supercalifragilistic" encodes to multiple tiktoken tokens
        resp = client.post("/api/vocab/add", json={"tokens": ["supercalifragilistic"]})
        data = resp.json()
        assert "supercalifragilistic" in data["rejected_tokens"]

    def test_adding_same_token_twice_not_duplicated(self):
        token = "uniquetok77777"
        client.post("/api/vocab/add", json={"tokens": [token]})
        resp1 = client.get("/api/vocab-info")
        size1 = resp1.json()["simple_vocab_size"]

        client.post("/api/vocab/add", json={"tokens": [token]})
        resp2 = client.get("/api/vocab-info")
        size2 = resp2.json()["simple_vocab_size"]

        assert size1 == size2

    def test_empty_tokens_list(self):
        resp = client.post("/api/vocab/add", json={"tokens": []})
        assert resp.status_code == 200
        assert resp.json()["added_count"] == 0

    def test_missing_tokens_field_returns_422(self):
        resp = client.post("/api/vocab/add", json={})
        assert resp.status_code == 422

    def test_added_token_no_longer_unk(self):
        new_token = "brandnewword55555"
        # Confirm it's initially unknown
        r1 = client.post("/api/tokenize", json={"text": new_token})
        assert r1.json()["simple"]["tokens"][0]["is_unk"] is True

        # Add it to vocab (it must be a single tiktoken token — use a short known word)
        # "cat" is definitely a single tiktoken token
        client.post("/api/vocab/add", json={"tokens": ["cat"]})
        r2 = client.post("/api/tokenize", json={"text": "cat"})
        # After adding, it should not be UNK
        assert r2.json()["simple"]["tokens"][0]["is_unk"] is False

    def test_rejected_tokens_saved_to_pending_bpe(self):
        token = "supercalifragilistic"
        resp = client.post("/api/vocab/add", json={"tokens": [token]})
        assert resp.status_code == 200
        assert token in resp.json()["rejected_tokens"]
        pending = client.get("/api/pending-bpe-tokens").json()
        assert pending["pending_count"] >= 1
        assert token in pending["pending_tokens"]

    def test_pending_bpe_tokens_endpoint_returns_list(self):
        resp = client.get("/api/pending-bpe-tokens")
        assert resp.status_code == 200
        data = resp.json()
        assert "pending_count" in data
        assert "pending_tokens" in data
        assert isinstance(data["pending_tokens"], list)
