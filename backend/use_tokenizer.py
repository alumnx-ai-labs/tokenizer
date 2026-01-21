from tokenizer import AdvancedWordTokenizer

# Load trained tokenizer
tokenizer = AdvancedWordTokenizer()
tokenizer.load_vocab('wikipedia_tokenizer.json')

# Encode text
text = "I don't think state-of-the-art models work well. The accuracy is 95.7%!"
tokens = tokenizer.encode(text)
print(f"Original: {text}")
print(f"Tokens: {tokens}")

# Decode back
decoded = tokenizer.decode(tokens)
print(f"Decoded: {decoded}")

# Get token breakdown
token_list = tokenizer.tokenize_text(text)
print(f"Token list: {token_list}")