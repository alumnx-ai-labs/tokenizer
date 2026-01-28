import os
import subprocess
import sqlite3
import re
from zipfile import ZipFile

def setup_kaggle():
    """Setup Kaggle credentials"""
    kaggle_dir = os.path.expanduser('~/.kaggle')
    os.makedirs(kaggle_dir, exist_ok=True)
    
    kaggle_json = os.path.join(kaggle_dir, 'kaggle.json')
    if not os.path.exists(kaggle_json):
        print(f"Please place your kaggle.json file in {kaggle_dir}")
        print("Download it from: https://www.kaggle.com/settings -> API -> Create New Token")
        return False
    
    os.chmod(kaggle_json, 0o600)
    return True

def download_smaller_dataset():
    """Download a smaller text dataset instead"""
    print("Downloading smaller Wikipedia sample dataset...")
    subprocess.run([
        'kaggle', 'datasets', 'download', '-d', 
        'mikeortman/wikipedia-sentences'
    ])
    
    print("Extracting dataset...")
    with ZipFile('wikipedia-sentences.zip', 'r') as zip_ref:
        zip_ref.extractall('.')
    
    print("Dataset downloaded!")
    return True

def create_sample_corpus():
    """Create a sample corpus from the smaller dataset"""
    input_file = 'wikisent2.txt'
    output_file = 'wikipedia_corpus.txt'
    
    if not os.path.exists(input_file):
        print(f"{input_file} not found. Looking for alternative files...")
        # List all txt files
        txt_files = [f for f in os.listdir('.') if f.endswith('.txt')]
        print(f"Available files: {txt_files}")
        if txt_files:
            input_file = txt_files[0]
        else:
            return False
    
    # Read and write
    with open(input_file, 'r', encoding='utf-8', errors='ignore') as f_in:
        with open(output_file, 'w', encoding='utf-8') as f_out:
            for line in f_in:
                f_out.write(line)
    
    print(f"Created {output_file}")
    return True

def preprocess_text(input_path='wikipedia_corpus.txt', output_path='cleaned_corpus.txt'):
    """Clean and preprocess Wikipedia text"""
    if not os.path.exists(input_path):
        print(f"File {input_path} not found!")
        return None
    
    with open(input_path, 'r', encoding='utf-8', errors='ignore') as f:
        text = f.read()
    
    print(f"Original size: {len(text):,} characters")
    
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    
    # Remove URLs
    text = re.sub(r'http\S+|www\.\S+', '', text)
    
    # Remove wiki markup
    text = re.sub(r'\[\[|\]\]|\{\{|\}\}', '', text)
    text = re.sub(r'\|[^\n]*', '', text)
    
    # Remove excessive whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r' {2,}', ' ', text)
    
    # Remove wiki-specific lines
    lines = text.split('\n')
    cleaned_lines = [line for line in lines 
                     if not re.match(r'^\s*(==|#|\*|Category:|File:|thumb|left|right)', line)]
    text = '\n'.join(cleaned_lines)
    
    print(f"Cleaned size: {len(text):,} characters")
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(text)
    
    print(f"Saved cleaned text to {output_path}")
    return text

if __name__ == '__main__':
    if not setup_kaggle():
        exit(1)
    
    print("\n" + "="*70)
    print("DATASET OPTIONS")
    print("="*70)
    print("1. Small dataset (~100MB) - Wikipedia sentences - RECOMMENDED")
    print("2. Large dataset (~7GB) - Full Wikipedia articles")
    
    choice = input("\nEnter choice (1 or 2): ").strip()
    
    if choice == '1':
        if download_smaller_dataset():
            create_sample_corpus()
            preprocess_text()
            print("\nData preparation complete!")
    else:
        print("\nNote: Large dataset is ~7GB and may take time to download.")
        confirm = input("Continue? (yes/no): ").strip().lower()
        if confirm == 'yes':
            print("Downloading large dataset...")
            subprocess.run([
                'kaggle', 'datasets', 'download', '-d', 
                'jkkphys/english-wikipedia-articles-20170820-sqlite'
            ])
            
            print("Extracting (this will take time)...")
            with ZipFile('english-wikipedia-articles-20170820-sqlite.zip', 'r') as zip_ref:
                zip_ref.extractall('.')
            
            # Extract from SQLite
            conn = sqlite3.connect('wikipedia.db')
            cursor = conn.cursor()
            
            query = "SELECT text FROM articles LIMIT 50000"
            with open('wikipedia_corpus.txt', 'w', encoding='utf-8') as f:
                for row in cursor.execute(query):
                    if row[0]:
                        f.write(row[0] + '\n\n')
            conn.close()
            
            preprocess_text()
            print("\nData preparation complete!")