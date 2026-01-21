import re
from collections import Counter
import json

class AdvancedWordTokenizer:
    def __init__(self, vocab_size=30000, min_freq=2):
        self.vocab_size = vocab_size
        self.min_freq = min_freq
        self.word2idx = {}
        self.idx2word = {}
        self.word_freq = Counter()
        
        # Special tokens
        self.PAD = '<PAD>'
        self.UNK = '<UNK>'
        self.BOS = '<BOS>'
        self.EOS = '<EOS>'
        
    def tokenize_text(self, text):
        """
        Advanced regex pattern that captures:
        - Words with apostrophes: don't, it's, we'll
        - Hyphenated words: state-of-the-art
        - Numbers: 123, 45.67, 1,234.56
        - All punctuation as separate tokens
        """
        pattern = r"\w+(?:'\w+)*|\w+-\w+(?:-\w+)*|\d+[.,]?\d*|[^\w\s]"
        tokens = re.findall(pattern, text.lower())
        return tokens
    
    def build_vocab(self, text):
        """Build vocabulary from text corpus"""
        print("Tokenizing corpus...")
        tokens = self.tokenize_text(text)
        print(f"Total tokens: {len(tokens):,}")
        
        print("Counting frequencies...")
        self.word_freq = Counter(tokens)
        print(f"Unique tokens: {len(self.word_freq):,}")
        
        # Initialize with special tokens
        self.word2idx = {
            self.PAD: 0,
            self.UNK: 1,
            self.BOS: 2,
            self.EOS: 3
        }
        
        # Add most frequent tokens
        idx = 4
        for word, freq in self.word_freq.most_common():
            if freq >= self.min_freq and idx < self.vocab_size:
                self.word2idx[word] = idx
                idx += 1
            if idx >= self.vocab_size:
                break
        
        self.idx2word = {idx: word for word, idx in self.word2idx.items()}
        
        print(f"\nVocabulary built!")
        print(f"Final vocab size: {len(self.word2idx):,}")
        print(f"Tokens meeting min_freq={self.min_freq}: {sum(1 for f in self.word_freq.values() if f >= self.min_freq):,}")
        
    def encode(self, text):
        """Text -> Token IDs"""
        tokens = self.tokenize_text(text)
        return [self.word2idx.get(token, self.word2idx[self.UNK]) for token in tokens]
    
    def decode(self, indices):
        """Token IDs -> Text"""
        tokens = [self.idx2word.get(idx, self.UNK) for idx in indices]
        
        # Smart spacing reconstruction
        result = []
        for i, token in enumerate(tokens):
            # Skip special tokens
            if token in [self.PAD, self.BOS, self.EOS]:
                continue
            
            # Add space before token (except punctuation and after opening brackets)
            if i > 0 and not re.match(r'^[.,!?;:\)\]]$', token) and tokens[i-1] not in ['(', '[']:
                result.append(' ')
            
            result.append(token)
        
        return ''.join(result)
    
    def get_vocab_stats(self):
        """Analyze vocabulary composition"""
        apostrophe_words = [w for w in self.word2idx.keys() if "'" in w]
        hyphenated_words = [w for w in self.word2idx.keys() if '-' in w]
        punctuation = [w for w in self.word2idx.keys() if re.match(r'^[^\w\s]+$', w)]
        numbers = [w for w in self.word2idx.keys() if re.match(r'^\d+', w)]
        
        return {
            'apostrophe_words': apostrophe_words[:20],
            'hyphenated_words': hyphenated_words[:20],
            'punctuation': punctuation[:20],
            'numbers': numbers[:20]
        }
    
    def save_vocab(self, path='tokenizer_vocab.json'):
        """Save vocabulary to JSON"""
        vocab_data = {
            'word2idx': self.word2idx,
            'idx2word': self.idx2word,
            'word_freq': dict(self.word_freq.most_common(1000)),
            'config': {
                'vocab_size': self.vocab_size,
                'min_freq': self.min_freq
            }
        }
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(vocab_data, f, ensure_ascii=False, indent=2)
        print(f"Saved to {path}")
    
    def load_vocab(self, path='tokenizer_vocab.json'):
        """Load vocabulary from JSON"""
        with open(path, 'r', encoding='utf-8') as f:
            vocab_data = json.load(f)
        
        self.word2idx = vocab_data['word2idx']
        self.idx2word = {int(k): v for k, v in vocab_data['idx2word'].items()}
        self.vocab_size = vocab_data['config']['vocab_size']
        self.min_freq = vocab_data['config']['min_freq']
        print(f"Loaded vocab with {len(self.word2idx):,} tokens")