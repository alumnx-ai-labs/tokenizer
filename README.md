## Getting Started

1. **Fork and clone the repository:**
```bash
git clone https://github.com/yourusername/tokenizer.git
cd tokenizer
```

## Installation

1. Install Kaggle:
```bash
pip install kaggle
```

2. Setup Kaggle credentials:
   - Go to [kaggle.com/settings](https://www.kaggle.com/settings) → API → Create New Token
   - Copy your username and key from the generated token
   - Create directory: `~/.kaggle/` (or `C:\Users\YourName\.kaggle\` on Windows)
   - Create a file named `kaggle.json` in the `.kaggle` directory with:
   ```json
   {"username":"your_username","key":"your_key"}
   ```
   - On Unix/Mac: `chmod 600 ~/.kaggle/kaggle.json`

## Usage

1. **Download and preprocess data:**
```bash
python download_data.py
```
Choose option 1 (small dataset, ~900MB) for quick testing or option 2 (large dataset, ~7GB) for full training.

**Generated files:**
- `wikipedia-sentences.zip` (downloaded dataset)
- `wikisent2.txt` (extracted sentences)
- `wikipedia_corpus.txt` (processed corpus)
- `cleaned_corpus.txt` (cleaned and preprocessed text)

2. **Train the tokenizer:**
```bash
python train_tokenizer.py
```

**Generated files:**
- `wikipedia_tokenizer.json` (trained tokenizer vocabulary and statistics)

**Output:** Vocabulary analysis including top frequent tokens, apostrophe words, hyphenated words, punctuation, and numbers

3. **Test the tokenizer:**
```bash
python test_tokenizer.py
```

**Output:** Test results in terminal

4. **Use the tokenizer:**
```bash
python use_tokenizer.py
```

**Output:** Tokenization examples and results

## What It Does

- Downloads Wikipedia text data from Kaggle
- Cleans and preprocesses the text (removes HTML, URLs, wiki markup)
- Trains a custom tokenizer on the cleaned corpus
- Provides tokenization functionality for text processing
