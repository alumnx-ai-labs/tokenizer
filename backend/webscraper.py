import requests
from bs4 import BeautifulSoup
from collections import Counter
# Import your tokenizer file (assuming it's named tokenizer_logic.py)
from tokenizer import AdvancedWordTokenizer 

class WebScraper:
    @staticmethod
    def get_clean_words(url: str):
        try:
            # Initialize your custom tokenizer
            tokenizer = AdvancedWordTokenizer(min_freq=2)
            
            header = {'User-Agent': 'Mozilla/5.0'}
            response = requests.get(url, headers=header, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            for script in soup(["script", "style"]):
                script.decompose()

            text = soup.get_text()

            # --- USE YOUR CUSTOM TOKENIZER ---
            # This uses your advanced regex for hyphens, apostrophes, etc.
            all_tokens = tokenizer.tokenize_text(text)
            
            # Filter by frequency > 2
            counts = Counter(all_tokens)
            frequent_tokens = [t for t, freq in counts.items() if freq > 2]
            
            return frequent_tokens

        except Exception as e:
            print(f"Scraper Error: {e}")
            return []