# Tokenizer Demo

A demonstration application comparing a simple regex-based tokenizer to OpenAI's TikToken.

## What's New

### Backend Tests
Added a full test suite under `backend/tests/` covering:
- **Unit tests** (`test_tokenizer_utils.py`) — tests for the core `_tokenize_regex` function (empty input, whitespace, punctuation, mixed cases, etc.) with no server or external files required.
- **Integration tests** (`test_api.py`) — tests for all FastAPI routes (`/api/health`, `/api/tokenize`, `/api/upload`) using FastAPI's `TestClient`.

Run the tests locally:
```bash
cd backend
pip install pytest httpx
pytest tests/ -v --tb=short
```

### CI/CD — GitHub Actions
Added a GitHub Actions workflow (`.github/workflows/backend-tests.yml`) that automatically runs the full pytest suite on every push and pull request targeting the `main` or `dev` branches (triggered only when files under `backend/` change).

### File Upload & Pending BPE Tokens
Added file upload support to the API. Tokens rejected during tokenization are saved to `backend/pending_bpe_tokens.txt` for future BPE (Byte Pair Encoding) vocabulary expansion.

### Pending BPE token tracking
The backend now exposes a new endpoint:
- `GET /api/pending-bpe-tokens`

This returns the list of tokens that could not be added as a single TikToken BPE token and are pending future BPE vocabulary expansion.

## Corpus Sources

The Simple Tokenizer's vocabulary has been expanded to 17,576 tokens using the following corpus sources:

1. **The Verdict** by Edith Wharton — [GitHub Source](https://raw.githubusercontent.com/rasbt/LLMs-from-scratch/refs/heads/main/ch02/01_main-chapter-code/the-verdict.txt)
2. **Association Football, and How To Play It** by John Cameron — [Project Gutenberg #35683](https://www.gutenberg.org/ebooks/35683)
3. **American Football** by Walter Camp — [Project Gutenberg #39743](https://www.gutenberg.org/ebooks/39743)
4. **Foot-ball: Its History for Five Centuries** by Montague Shearman — [Project Gutenberg #74421](https://www.gutenberg.org/ebooks/74421)
5. **Football Days** by William H. Edwards — [Project Gutenberg #18048](https://www.gutenberg.org/ebooks/18048)
6. **Pride and Prejudice** by Jane Austen — [Project Gutenberg #1342](https://www.gutenberg.org/ebooks/1342)