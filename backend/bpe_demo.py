import re
from collections import defaultdict

def get_stats(vocab):
    pairs = defaultdict(int)
    for word, freq in vocab.items():
        symbols = word.split()
        for i in range(len(symbols)-1):
            pairs[symbols[i], symbols[i+1]] += freq
    return pairs

def merge_vocab(pair, v_in):
    v_out = {}
    bigram = re.escape(' '.join(pair))
    p = re.compile(r'(?<!\S)' + bigram + r'(?!\S)')
    for word in v_in:
        w_out = p.sub(''.join(pair), word)
        v_out[w_out] = v_in[word]
    return v_out

def run_bpe_training(text: str, num_merges: int):
    # Basic pre-tokenization: split by words and punctuation
    words = re.findall(r'\w+|[^\w\s]', text, re.UNICODE)
    
    # Initialize vocabulary with characters separated by spaces
    vocab = defaultdict(int)
    for word in words:
        # separate characters with space and add </w> to denote end of word
        spaced_word = " ".join(list(word)) + " </w>"
        vocab[spaced_word] += 1
        
    merges = []
    
    for i in range(num_merges):
        pairs = get_stats(vocab)
        if not pairs:
            break
            
        best_pair = max(pairs, key=pairs.get)
        best_freq = pairs[best_pair]
        
        # If the most frequent pair occurs only once, no point in merging
        if best_freq < 2:
            break
            
        vocab = merge_vocab(best_pair, vocab)
        
        merges.append({
            "step": i + 1,
            "pair1": best_pair[0],
            "pair2": best_pair[1],
            "merged": "".join(best_pair),
            "frequency": best_freq
        })
        
    return merges
