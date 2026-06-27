"""
FastAPI backend for the Tokenizer Demo application.
Serves both the Simple Tokenizer (built from The Verdict dataset)
and the TikToken (cl100k_base) tokenizer.
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import re
import json
import threading
import urllib.request
import os
import tiktoken
import fitz  # PyMuPDF

app = FastAPI(title="Tokenizer Demo API")

_frontend_url = os.environ.get("FRONTEND_URL", "")
_origins = [o for o in ["http://localhost:5173", "http://localhost:3000", _frontend_url] if o]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────────────────
# Simple Tokenizer — built from The Verdict dataset
# ──────────────────────────────────────────────────────────

VERDICT_URL = (
    "https://raw.githubusercontent.com/rasbt/LLMs-from-scratch/"
    "refs/heads/main/ch02/01_main-chapter-code/the-verdict.txt"
)
VERDICT_PATH = os.path.join(os.path.dirname(__file__), "the-verdict.txt")
CORPUS_PATH = os.path.join(os.path.dirname(__file__), "corpus.txt")
# Tokens admitted from uploads, merged into the vocab on (re)build.
EXTRA_VOCAB_PATH = os.path.join(os.path.dirname(__file__), "extra_vocab.json")
# Candidate words tiktoken did not recognise — queued for a future BPE tokenizer.
BPE_BACKLOG_PATH = os.path.join(os.path.dirname(__file__), "bpe_backlog.json")

SPECIAL_TOKENS = ["<UNK>", "<|endoftext|>"]
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB

word_to_id: dict[str, int] = {}
id_to_word: dict[int, str] = {}
vocab_size_simple: int = 0
# Guards every mutation of the vocab + the on-disk JSON lists.
_vocab_lock = threading.Lock()


def _tokenize_regex(text: str) -> list[str]:
    tokens = re.split(r'([,.:;?_!"()\']|--|\s)', text)
    return [t.strip() for t in tokens if t.strip()]


def _load_word_list(path: str) -> list[str]:
    """Load a JSON list of words from disk; return [] if missing/corrupt."""
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return [w for w in data if isinstance(w, str)]
    except (json.JSONDecodeError, OSError):
        return []


def _save_word_list(path: str, words: list[str]) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(words, f, ensure_ascii=False, indent=2)


def _build_vocab() -> None:
    global word_to_id, id_to_word, vocab_size_simple

    if os.path.exists(CORPUS_PATH):
        source_path = CORPUS_PATH
    else:
        if not os.path.exists(VERDICT_PATH):
            urllib.request.urlretrieve(VERDICT_URL, VERDICT_PATH)
        source_path = VERDICT_PATH

    with open(source_path, "r", encoding="utf-8") as f:
        raw_text = f.read()

    all_tokens = set(_tokenize_regex(raw_text))
    all_tokens.update(_load_word_list(EXTRA_VOCAB_PATH))  # admitted upload tokens
    vocab = sorted(all_tokens) + SPECIAL_TOKENS  # specials stay last for stable <UNK>
    word_to_id = {word: idx for idx, word in enumerate(vocab)}
    id_to_word = {idx: word for word, idx in word_to_id.items()}
    vocab_size_simple = len(vocab)


_build_vocab()

# ──────────────────────────────────────────────────────────
# TikToken
# ──────────────────────────────────────────────────────────

tiktoken_enc = tiktoken.get_encoding("cl100k_base")


def _tiktoken_recognizes(word: str) -> bool:
    """A word is admitted if it (or ' '+word) encodes to exactly one tiktoken id.

    In cl100k_base most natural words only collapse to a single token when
    prefixed with a leading space, so both variants are checked.
    """
    if len(tiktoken_enc.encode(word)) == 1:
        return True
    return len(tiktoken_enc.encode(" " + word)) == 1


# ──────────────────────────────────────────────────────────
# Upload text extraction
# ──────────────────────────────────────────────────────────

def _extract_txt(raw: bytes) -> str:
    return raw.decode("utf-8", errors="replace")


def _extract_pdf(raw: bytes) -> str:
    try:
        with fitz.open(stream=raw, filetype="pdf") as doc:
            return "\n".join(page.get_text() for page in doc)
    except Exception as exc:  # malformed/encrypted PDF
        raise HTTPException(status_code=400, detail=f"Could not read PDF: {exc}")


# ──────────────────────────────────────────────────────────
# Request / Response models
# ──────────────────────────────────────────────────────────

class TokenizeRequest(BaseModel):
    text: str


class TokenInfo(BaseModel):
    token: str
    token_id: int
    is_unk: bool = False


class TokenizerResult(BaseModel):
    tokens: list[TokenInfo]
    token_count: int
    vocab_size: int
    tokenizer_name: str


class TokenizeResponse(BaseModel):
    character_count: int
    simple: TokenizerResult
    tiktoken: TokenizerResult


class UploadResponse(BaseModel):
    filename: str
    character_count: int
    token_count: int
    candidate_count: int
    admitted: list[str]
    admitted_count: int
    rejected: list[str]
    rejected_count: int
    new_vocab_size: int


# ──────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/vocab-info")
def vocab_info():
    return {
        "simple_vocab_size": vocab_size_simple,
        "tiktoken_vocab_size": tiktoken_enc.n_vocab,
        "tiktoken_encoding": "cl100k_base",
    }


@app.post("/api/tokenize", response_model=TokenizeResponse)
def tokenize(req: TokenizeRequest):
    text = req.text
    if not text:
        raise HTTPException(status_code=400, detail="text must not be empty")

    # — Simple tokenizer —
    raw_tokens = _tokenize_regex(text)
    simple_tokens: list[TokenInfo] = []
    for tok in raw_tokens:
        is_unk = tok not in word_to_id
        tid = word_to_id.get(tok, word_to_id["<UNK>"])
        simple_tokens.append(TokenInfo(token=tok, token_id=tid, is_unk=is_unk))

    # — TikToken —
    tt_ids = tiktoken_enc.encode(text)
    tiktoken_tokens: list[TokenInfo] = []
    for tid in tt_ids:
        token_bytes = tiktoken_enc.decode_single_token_bytes(tid)
        token_str = token_bytes.decode("utf-8", errors="replace")
        tiktoken_tokens.append(TokenInfo(token=token_str, token_id=tid, is_unk=False))

    return TokenizeResponse(
        character_count=len(text),
        simple=TokenizerResult(
            tokens=simple_tokens,
            token_count=len(simple_tokens),
            vocab_size=vocab_size_simple,
            tokenizer_name="Simple Tokenizer",
        ),
        tiktoken=TokenizerResult(
            tokens=tiktoken_tokens,
            token_count=len(tiktoken_tokens),
            vocab_size=tiktoken_enc.n_vocab,
            tokenizer_name="TikToken (cl100k_base)",
        ),
    )


@app.get("/api/example-text")
def example_text():
    return {
        "text": (
            "I had always thought Jack Gisburn rather a cheap genius--"
            "though a good fellow enough--so it was no great surprise to me "
            "to hear that, in the height of his glory, he had dropped his painting."
        )
    }


@app.get("/api/backlog")
def backlog():
    """Words queued for a future BPE tokenizer (rejected by tiktoken review)."""
    words = _load_word_list(BPE_BACKLOG_PATH)
    return {"words": words, "count": len(words)}


@app.post("/api/upload", response_model=UploadResponse)
async def upload(file: UploadFile = File(...)):
    name = (file.filename or "").strip()
    lower = name.lower()
    if not (lower.endswith(".txt") or lower.endswith(".pdf")):
        raise HTTPException(status_code=400, detail="Only .txt and .pdf files are supported")

    raw = await file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds the 10 MB limit")
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    text = _extract_pdf(raw) if lower.endswith(".pdf") else _extract_txt(raw)
    tokens = _tokenize_regex(text)
    if not tokens:
        raise HTTPException(status_code=400, detail="No extractable text found in file")

    with _vocab_lock:
        # Candidate = a word the simple vocab does not already know.
        known = set(word_to_id)
        specials = set(SPECIAL_TOKENS)
        candidates = sorted(
            {t for t in tokens if t not in known and t not in specials}
        )

        admitted = [w for w in candidates if _tiktoken_recognizes(w)]
        rejected = [w for w in candidates if w not in set(admitted)]

        if admitted:
            extra = sorted(set(_load_word_list(EXTRA_VOCAB_PATH)) | set(admitted))
            _save_word_list(EXTRA_VOCAB_PATH, extra)
        if rejected:
            backlog_words = sorted(set(_load_word_list(BPE_BACKLOG_PATH)) | set(rejected))
            _save_word_list(BPE_BACKLOG_PATH, backlog_words)

        if admitted:
            _build_vocab()  # rebuild so admitted tokens get ids immediately

        new_size = vocab_size_simple

    return UploadResponse(
        filename=name,
        character_count=len(text),
        token_count=len(tokens),
        candidate_count=len(candidates),
        admitted=admitted,
        admitted_count=len(admitted),
        rejected=rejected,
        rejected_count=len(rejected),
        new_vocab_size=new_size,
    )
