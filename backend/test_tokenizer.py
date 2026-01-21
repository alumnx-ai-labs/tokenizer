from tokenizer import AdvancedWordTokenizer

def load_and_test():
    """Load saved tokenizer and run comprehensive tests"""
    
    # Load tokenizer
    tokenizer = AdvancedWordTokenizer()
    tokenizer.load_vocab('wikipedia_tokenizer.json')
    
    print("\n" + "="*70)
    print("TOKENIZER TESTING")
    print("="*70)
    
    # Test 1: Contractions and apostrophes
    print("\n--- Test 1: Contractions & Apostrophes ---")
    text1 = "I don't think it's working. We'll try again, won't we?"
    enc1 = tokenizer.encode(text1)
    dec1 = tokenizer.decode(enc1)
    print(f"Original:  {text1}")
    print(f"Encoded:   {enc1}")
    print(f"Decoded:   {dec1}")
    
    # Test 2: Hyphenated words
    print("\n--- Test 2: Hyphenated Words ---")
    text2 = "State-of-the-art machine-learning for real-time analysis."
    enc2 = tokenizer.encode(text2)
    dec2 = tokenizer.decode(enc2)
    print(f"Original:  {text2}")
    print(f"Encoded:   {enc2}")
    print(f"Decoded:   {dec2}")
    
    # Test 3: Numbers and punctuation
    print("\n--- Test 3: Numbers & Punctuation ---")
    text3 = "The accuracy is 95.7%! Price: $1,234.56 (roughly €1,100)."
    enc3 = tokenizer.encode(text3)
    dec3 = tokenizer.decode(enc3)
    print(f"Original:  {text3}")
    print(f"Encoded:   {enc3}")
    print(f"Decoded:   {dec3}")
    
    # Test 4: Unknown words
    print("\n--- Test 4: Unknown Words (OOV) ---")
    text4 = "Supercalifragilisticexpialidocious antidisestablishmentarianism"
    enc4 = tokenizer.encode(text4)
    dec4 = tokenizer.decode(enc4)
    print(f"Original:  {text4}")
    print(f"Encoded:   {enc4}")
    print(f"Decoded:   {dec4}")
    print(f"UNK token ID: {tokenizer.word2idx[tokenizer.UNK]}")
    
    # Test 5: Edge cases
    print("\n--- Test 5: Edge Cases ---")
    edge_cases = [
        "won't can't shouldn't've",
        "re-re-written pre-processing",
        "123,456.789 + 0.5",
        "(test) [brackets] {braces}",
        "Multiple...dots... and--dashes"
    ]
    
    for text in edge_cases:
        enc = tokenizer.encode(text)
        dec = tokenizer.decode(enc)
        tokens = tokenizer.tokenize_text(text)
        print(f"\nInput:   {text}")
        print(f"Tokens:  {tokens}")
        print(f"Encoded: {enc}")
        print(f"Decoded: {dec}")
    
    # Compression analysis
    print("\n" + "="*70)
    print("COMPRESSION ANALYSIS")
    print("="*70)
    
    sample_text = "The quick brown fox jumps over the lazy dog. " * 100
    tokens = tokenizer.tokenize_text(sample_text)
    print(f"Text length: {len(sample_text):,} characters")
    print(f"Token count: {len(tokens):,}")
    print(f"Compression ratio: {len(sample_text)/len(tokens):.2f} chars/token")
    
    # Interactive test
    print("\n" + "="*70)
    print("INTERACTIVE TEST (type 'quit' to exit)")
    print("="*70)
    
    while True:
        text = input("\nEnter text: ")
        if text.lower() == 'quit':
            break
        
        tokens = tokenizer.tokenize_text(text)
        encoded = tokenizer.encode(text)
        decoded = tokenizer.decode(encoded)
        
        print(f"Tokens:  {tokens}")
        print(f"Encoded: {encoded}")
        print(f"Decoded: {decoded}")

if __name__ == '__main__':
    load_and_test()