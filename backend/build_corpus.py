import os
import re
import urllib.request

BOOKS = {
    "association_football": "https://www.gutenberg.org/cache/epub/35683/pg35683.txt",
    "american_football": "https://www.gutenberg.org/cache/epub/39743/pg39743.txt",
    "football_history": "https://www.gutenberg.org/cache/epub/74421/pg74421.txt",
    "football_days": "https://www.gutenberg.org/cache/epub/18048/pg18048.txt",
    "pride_prejudice": "https://www.gutenberg.org/cache/epub/1342/pg1342.txt",
}

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
VERDICT_PATH = os.path.join(BACKEND_DIR, "the-verdict.txt")
COMBINED_PATH = os.path.join(BACKEND_DIR, "combined-corpus.txt")

def download_and_clean():
    combined_text = ""
    
    # 1. Read existing the-verdict.txt
    if os.path.exists(VERDICT_PATH):
        print("Reading the-verdict.txt...")
        with open(VERDICT_PATH, "r", encoding="utf-8") as f:
            combined_text += f.read() + "\n\n"
    else:
        print("Warning: the-verdict.txt not found!")

    # 2. Download and clean Gutenberg books
    for name, url in BOOKS.items():
        print(f"Downloading {name} from {url}...")
        try:
            req = urllib.request.Request(
                url, 
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
            )
            with urllib.request.urlopen(req) as response:
                content = response.read().decode('utf-8', errors='ignore')
            
            # Clean content using start/end markers
            start_marker = re.search(r"\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG EBOOK.*?\*\*\*", content, re.IGNORECASE)
            end_marker = re.search(r"\*\*\*\s*END OF (THE|THIS) PROJECT GUTENBERG EBOOK.*?\*\*\*", content, re.IGNORECASE)
            
            if start_marker and end_marker:
                cleaned_content = content[start_marker.end():end_marker.start()].strip()
                print(f"  Cleaned {name}: keep {len(cleaned_content)} chars out of {len(content)}")
            elif start_marker:
                cleaned_content = content[start_marker.end():].strip()
                print(f"  Warning: Only start marker found for {name}. Keeping {len(cleaned_content)} chars.")
            else:
                cleaned_content = content.strip()
                print(f"  Warning: No Gutenberg markers found for {name}. Keeping entire text.")
                
            combined_text += cleaned_content + "\n\n"
            
        except Exception as e:
            print(f"Error downloading or processing {name}: {e}")
            raise e

    print(f"Writing combined corpus to {COMBINED_PATH}...")
    with open(COMBINED_PATH, "w", encoding="utf-8") as f:
        f.write(combined_text)
    print("Done!")

if __name__ == "__main__":
    download_and_clean()
