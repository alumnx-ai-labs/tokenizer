import os
import re
import urllib.request

HERE = os.path.dirname(__file__)
VERDICT_PATH = os.path.join(HERE, "the-verdict.txt")
CORPUS_PATH = os.path.join(HERE, "corpus.txt")
GUTENBERG_BOOKS = [
    ("Association Football, and How To Play It", 35683),
    ("American Football", 39743),
    ("Foot-ball: Its History for Five Centuries", 74421),
    ("Football Days", 18048),
    ("Pride and Prejudice", 1342),
]

GUTENBERG_URL = "https://www.gutenberg.org/cache/epub/{id}/pg{id}.txt"
_START_RE = re.compile(r"\*\*\*\s*START OF TH(?:E|IS) PROJECT GUTENBERG EBOOK.*?\*\*\*", re.IGNORECASE)
_END_RE = re.compile(r"\*\*\*\s*END OF TH(?:E|IS) PROJECT GUTENBERG EBOOK.*?\*\*\*", re.IGNORECASE)


def strip_gutenberg_boilerplate(text: str) -> str:
    """Return only the content between the START and END markers."""
    start = _START_RE.search(text)
    end = _END_RE.search(text)
    body = text[start.end() : end.start()] if start and end else text
    return body.strip()


def fetch_book(book_id: int) -> str:
    url = GUTENBERG_URL.format(id=book_id)
    with urllib.request.urlopen(url, timeout=60) as resp:
        raw = resp.read().decode("utf-8", errors="replace")
    return strip_gutenberg_boilerplate(raw)


def _tokenize_regex(text: str) -> list[str]:
    """Mirror of the backend's tokenizer, for the vocab-size report."""
    tokens = re.split(r'([,.:;?_!"()\']|--|\s)', text)
    return [t.strip() for t in tokens if t.strip()]


def main() -> None:
    parts: list[str] = []

    if os.path.exists(VERDICT_PATH):
        with open(VERDICT_PATH, "r", encoding="utf-8") as f:
            parts.append(f.read().strip())
        print(f"[ok]   The Verdict (local)")
    else:
        print("[warn] the-verdict.txt not found locally; skipping")

    for title, book_id in GUTENBERG_BOOKS:
        print(f"[..]   downloading {title} (#{book_id})")
        body = fetch_book(book_id)
        parts.append(body)
        print(f"[ok]   {title}: {len(body):,} chars")

    combined = "\n\n".join(parts)
    with open(CORPUS_PATH, "w", encoding="utf-8") as f:
        f.write(combined)

    tokens = _tokenize_regex(combined)
    vocab_size = len(set(tokens)) + 2  # + <UNK> and <|endoftext|>
    print(f"\nWrote {CORPUS_PATH}")
    print(f"Total chars : {len(combined):,}")
    print(f"Total tokens: {len(tokens):,}")
    print(f"Vocab size  : {vocab_size:,} (unique + <UNK> + <|endoftext|>)")


if __name__ == "__main__":
    main()
