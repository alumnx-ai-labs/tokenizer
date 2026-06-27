# Tokenizer Demo

An educational web app that visualises and compares two tokenisation strategies
side by side:

- **Simple Tokenizer** — a word-level regex tokeniser whose vocabulary is built
  from a public-domain text corpus. Words outside the vocabulary collapse to a
  single `<UNK>` token.
- **TikToken** — OpenAI's production BPE tokeniser (`cl100k_base`, used by
  GPT-4/3.5), which never produces `<UNK>` because it splits unknown words into
  sub-word units.

Enter any text to see how each tokeniser splits it, the resulting token IDs, and
the token counts.

## Project layout

- `backend/` — FastAPI service (`main.py`) that builds the simple vocabulary and
  exposes the tokenisation API.
- `frontend/` — React + Vite single-page app.

## Running locally

**Backend** (serves on `http://localhost:8000`):

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend** (serves on `http://localhost:5173`, proxies `/api` to the backend):

```bash
cd frontend
npm install
npm run dev
```

## Corpus Sources

The Simple Tokenizer's vocabulary (≈17,500 tokens) is built from the following
public-domain texts. The five Project Gutenberg books are downloaded, stripped
of their Gutenberg boilerplate, and combined with *The Verdict* into
`backend/combined-corpus.txt` by `backend/build_corpus.py`.

| # | Title | Source |
|---|-------|--------|
| 1 | *The Verdict* — Edith Wharton | [rasbt/LLMs-from-scratch](https://github.com/rasbt/LLMs-from-scratch/blob/main/ch02/01_main-chapter-code/the-verdict.txt) |
| 2 | *Association Football, and How To Play It* | [Project Gutenberg #35683](https://www.gutenberg.org/ebooks/35683) |
| 3 | *American Football* | [Project Gutenberg #39743](https://www.gutenberg.org/ebooks/39743) |
| 4 | *Foot-ball: Its History for Five Centuries* | [Project Gutenberg #74421](https://www.gutenberg.org/ebooks/74421) |
| 5 | *Football Days* | [Project Gutenberg #18048](https://www.gutenberg.org/ebooks/18048) |
| 6 | *Pride and Prejudice* — Jane Austen | [Project Gutenberg #1342](https://www.gutenberg.org/ebooks/1342) |

### Regenerating the corpus

```bash
cd backend
python build_corpus.py   # downloads, cleans, and writes combined-corpus.txt
```

The backend builds `combined-corpus.txt` on first startup if it is missing
(via `build_corpus.download_and_clean()`), then reads it to build the vocabulary.
Words admitted from uploads are layered on top from `backend/extra_vocab.json`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
