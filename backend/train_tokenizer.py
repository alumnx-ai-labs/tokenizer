from tokenizer import AdvancedWordTokenizer

def train_tokenizer(corpus_path='cleaned_corpus.txt', vocab_size=30000, min_freq=2):
    """Train tokenizer on preprocessed corpus"""
    
    # Load corpus
    print(f"Loading corpus from {corpus_path}...")
    with open(corpus_path, 'r', encoding='utf-8') as f:
        text = f.read()
    
    print(f"Corpus size: {len(text):,} characters")
    
    # Create and train tokenizer
    tokenizer = AdvancedWordTokenizer(vocab_size=vocab_size, min_freq=min_freq)
    tokenizer.build_vocab(text)
    
    # Analyze vocabulary
    print("\n" + "="*70)
    print("VOCABULARY ANALYSIS")
    print("="*70)
    
    stats = tokenizer.get_vocab_stats()
    
    # Count different token types
    apostrophe_count = len([w for w in tokenizer.word2idx if "'" in w])
    hyphen_count = len([w for w in tokenizer.word2idx if '-' in w])
    
    print(f"\nApostrophe words: {apostrophe_count}")
    print(f"Examples: {stats['apostrophe_words'][:10]}")
    
    print(f"\nHyphenated words: {hyphen_count}")
    print(f"Examples: {stats['hyphenated_words'][:10]}")
    
    print(f"\nPunctuation tokens: {len(stats['punctuation'])}")
    print(f"Examples: {stats['punctuation']}")
    
    print(f"\nNumber tokens: {len(stats['numbers'])}")
    print(f"Examples: {stats['numbers'][:10]}")
    
    # Top frequent words
    print("\n" + "="*70)
    print("TOP 50 MOST FREQUENT TOKENS")
    print("="*70)
    for i, (word, freq) in enumerate(tokenizer.word_freq.most_common(50), 1):
        print(f"{i:2d}. '{word}': {freq:,}")
    
    # Save tokenizer
    tokenizer.save_vocab('wikipedia_tokenizer.json')
    
    return tokenizer

if __name__ == '__main__':
    tokenizer = train_tokenizer()
    print("\nTokenizer training complete!")