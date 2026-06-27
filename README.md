# Tokenizer Demo

A full-stack web application that lets you explore how language models break text into tokens. Enter any text and instantly compare two tokenization strategies side by side:

- **Simple Tokenizer** — a regex-based tokenizer whose vocabulary is built from a combined books corpus (Project Gutenberg texts + *The Verdict*). Unknown words are mapped to a special `<UNK>` token.
- **TikToken (cl100k_base)** — OpenAI's production BPE tokenizer used by GPT-4 and GPT-3.5. It handles any input by splitting words into sub-word pieces.

The app also supports uploading `.txt` and `.pdf` files for tokenization, and allows you to expand the Simple Tokenizer's vocabulary at runtime by adding new tokens.

## Tech Stack

| Layer    | Technology                        |
| -------- | --------------------------------- |
| Frontend | React 19, Vite 8                  |
| Backend  | Python 3.12+, FastAPI, Uvicorn    |
| Tokenizer| TikToken, custom regex tokenizer  |

## Prerequisites

- **Python 3.12+** with `pip`
- **Node.js 18+** with `npm`

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/tokenizer.git
cd tokenizer
```

### 2. Run the Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

The API server will start at **http://localhost:8000**.

On first run, if the combined corpus file is missing, it will automatically download and build it from the configured book sources.

**API endpoints:**

| Method | Endpoint             | Description                          |
| ------ | -------------------- | ------------------------------------ |
| GET    | `/api/health`        | Health check                         |
| GET    | `/api/vocab-info`    | Vocabulary sizes for both tokenizers |
| POST   | `/api/tokenize`      | Tokenize input text                  |
| GET    | `/api/example-text`  | Get example text for demo            |
| POST   | `/api/extract-text`  | Extract text from uploaded file      |
| POST   | `/api/vocab/add`     | Add new tokens to Simple Tokenizer   |

### 3. Run the Frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The app will start at **http://localhost:5173**.

The Vite dev server proxies `/api` requests to `http://localhost:8000`, so both servers must be running for the app to work.

## Project Structure

```
tokenizer/
├── backend/
│   ├── main.py              # FastAPI app with all API routes
│   ├── build_corpus.py      # Downloads and combines book texts into corpus
│   ├── requirements.txt     # Python dependencies
│   ├── the-verdict.txt      # Base corpus text
│   └── combined-corpus.txt  # Auto-generated combined corpus
├── frontend/
│   ├── src/
│   │   ├── App.jsx                    # Main app component
│   │   ├── components/
│   │   │   ├── TokenizerPanel.jsx     # Token display panel
│   │   │   └── TokenDisplay.jsx       # Individual token rendering
│   │   ├── main.jsx                   # Entry point
│   │   └── index.css                  # Global styles
│   ├── package.json
│   └── vite.config.js        # Vite config with API proxy
├── CONTRIBUTING.md
└── README.md
```

## Corpus Sources

The Simple Tokenizer's vocabulary is built from the following corpus sources:

1. **The Verdict** by Edith Wharton — [GitHub Source](https://raw.githubusercontent.com/rasbt/LLMs-from-scratch/refs/heads/main/ch02/01_main-chapter-code/the-verdict.txt)
2. **Association Football, and How To Play It** by John Cameron — [Project Gutenberg #35683](https://www.gutenberg.org/ebooks/35683)
3. **American Football** by Walter Camp — [Project Gutenberg #39743](https://www.gutenberg.org/ebooks/39743)
4. **Foot-ball: Its History for Five Centuries** by Montague Shearman — [Project Gutenberg #74421](https://www.gutenberg.org/ebooks/74421)
5. **Football Days** by William H. Edwards — [Project Gutenberg #18048](https://www.gutenberg.org/ebooks/18048)
6. **Pride and Prejudice** by Jane Austen — [Project Gutenberg #1342](https://www.gutenberg.org/ebooks/1342)