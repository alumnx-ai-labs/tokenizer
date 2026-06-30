"""
FastAPI backend for the Tokenizer Demo application.
Serves both the Simple Tokenizer (built from The Verdict dataset)
and the TikToken (cl100k_base) tokenizer.
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import re
import urllib.request
import os
import tiktoken
import io
import pypdf

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
# Simple Tokenizer — built from the combined books corpus
# ──────────────────────────────────────────────────────────

VERDICT_URL = (
    "https://raw.githubusercontent.com/rasbt/LLMs-from-scratch/"
    "refs/heads/main/ch02/01_main-chapter-code/the-verdict.txt"
)
VERDICT_PATH = os.path.join(os.path.dirname(__file__), "the-verdict.txt")
COMBINED_PATH = os.path.join(os.path.dirname(__file__), "combined-corpus.txt")
PENDING_BPE_PATH = os.path.join(os.path.dirname(__file__), "pending_bpe_tokens.txt")

word_to_id: dict[str, int] = {}
id_to_word: dict[int, str] = {}
vocab_size_simple: int = 0
review_queue: set[str] = set()


def _tokenize_regex(text: str) -> list[str]:
    tokens = re.split(r'([,.:;?_!"()\']|--|\s)', text)
    return [t.strip() for t in tokens if t.strip()]


def _build_vocab() -> None:
    global word_to_id, id_to_word, vocab_size_simple

    if not os.path.exists(COMBINED_PATH):
        from build_corpus import download_and_clean
        download_and_clean()

    with open(COMBINED_PATH, "r", encoding="utf-8") as f:
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


class AddTokensRequest(BaseModel):
    tokens: list[str]


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


@app.post("/api/extract-text")
async def extract_text(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    filename = file.filename.lower()
    content = await file.read()
    
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 10MB.")
    
    try:
        if filename.endswith(".txt"):
            text = content.decode("utf-8")
            return {"text": text}
        elif filename.endswith(".pdf"):
            pdf_file = io.BytesIO(content)
            reader = pypdf.PdfReader(pdf_file)
            text = ""
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
            return {"text": text.strip()}
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload .txt or .pdf files.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@app.post("/api/vocab/add")
def add_tokens(req: AddTokensRequest):
    global word_to_id, id_to_word, vocab_size_simple
    added_count = 0
    rejected_tokens = []
    for token in req.tokens:
        tt_ids = tiktoken_enc.encode(token)
        if len(tt_ids) == 1:
            if token not in word_to_id:
                new_id = len(word_to_id)
                word_to_id[token] = new_id
                id_to_word[new_id] = token
                vocab_size_simple += 1
                added_count += 1
        else:
            rejected_tokens.append(token)
            
    if rejected_tokens:
        existing_pending = set()
        if os.path.exists(PENDING_BPE_PATH):
            with open(PENDING_BPE_PATH, "r", encoding="utf-8") as f:
                existing_pending = set(line.strip() for line in f)
        
        with open(PENDING_BPE_PATH, "a", encoding="utf-8") as f:
            for rt in rejected_tokens:
                if rt not in existing_pending:
                    f.write(rt + "\n")
                    existing_pending.add(rt)
                    
    return {
        "status": "success", 
        "added_count": added_count, 
        "new_vocab_size": vocab_size_simple,
        "rejected_tokens": rejected_tokens
    }


class ReviewQueueItem(BaseModel):
    token: str
    exists_in_tiktoken: bool


class ProcessReviewResponse(BaseModel):
    status: str
    admitted_count: int
    rejected_count: int
    new_vocab_size: int


@app.post("/api/vocab/submit")
def submit_tokens_for_review(req: AddTokensRequest):
    global review_queue
    added = 0
    for token in req.tokens:
        if token and token not in word_to_id and token not in review_queue:
            review_queue.add(token)
            added += 1
    return {"status": "success", "submitted_count": added, "queue_size": len(review_queue)}


@app.get("/api/vocab/review-queue", response_model=list[ReviewQueueItem])
def get_review_queue():
    items = []
    for token in sorted(review_queue):
        tt_ids = tiktoken_enc.encode(token)
        exists_in_tiktoken = (len(tt_ids) == 1)
        items.append(ReviewQueueItem(token=token, exists_in_tiktoken=exists_in_tiktoken))
    return items


@app.post("/api/vocab/review-process", response_model=ProcessReviewResponse)
def process_review_queue():
    global word_to_id, id_to_word, vocab_size_simple, review_queue
    admitted_count = 0
    rejected_tokens = []
    
    for token in sorted(review_queue):
        tt_ids = tiktoken_enc.encode(token)
        if len(tt_ids) == 1:
            if token not in word_to_id:
                new_id = len(word_to_id)
                word_to_id[token] = new_id
                id_to_word[new_id] = token
                vocab_size_simple += 1
                admitted_count += 1
        else:
            rejected_tokens.append(token)
            
    if rejected_tokens:
        existing_pending = set()
        if os.path.exists(PENDING_BPE_PATH):
            with open(PENDING_BPE_PATH, "r", encoding="utf-8") as f:
                existing_pending = set(line.strip() for line in f)
        
        with open(PENDING_BPE_PATH, "a", encoding="utf-8") as f:
            for rt in rejected_tokens:
                if rt not in existing_pending:
                    f.write(rt + "\n")
                    existing_pending.add(rt)
                    
    review_queue.clear()
    
    return ProcessReviewResponse(
        status="success",
        admitted_count=admitted_count,
        rejected_count=len(rejected_tokens),
        new_vocab_size=vocab_size_simple
    )
