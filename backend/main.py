"""
FastAPI backend for the Tokenizer Demo application.
Serves both the Simple Tokenizer (built from The Verdict dataset)
and the TikToken (cl100k_base) tokenizer.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import re
import urllib.request
import os
import tiktoken

app = FastAPI(title="Tokenizer Demo API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
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

word_to_id: dict[str, int] = {}
id_to_word: dict[int, str] = {}
vocab_size_simple: int = 0


def _tokenize_regex(text: str) -> list[str]:
    tokens = re.split(r'([,.:;?_!"()\']|--|\s)', text)
    return [t.strip() for t in tokens if t.strip()]


def _build_vocab() -> None:
    global word_to_id, id_to_word, vocab_size_simple

    if not os.path.exists(VERDICT_PATH):
        urllib.request.urlretrieve(VERDICT_URL, VERDICT_PATH)

    with open(VERDICT_PATH, "r", encoding="utf-8") as f:
        raw_text = f.read()

    all_tokens = _tokenize_regex(raw_text)
    vocab = sorted(set(all_tokens)) + ["<UNK>", "<|endoftext|>"]
    word_to_id = {word: idx for idx, word in enumerate(vocab)}
    id_to_word = {idx: word for word, idx in word_to_id.items()}
    vocab_size_simple = len(vocab)


_build_vocab()

# ──────────────────────────────────────────────────────────
# TikToken
# ──────────────────────────────────────────────────────────

tiktoken_enc = tiktoken.get_encoding("cl100k_base")

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
