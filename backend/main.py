import os
import json
import urllib.parse
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Import your modular components
from webscraper import WebScraper
from tokenizer import AdvancedWordTokenizer

active_connections = set()
# 1. Setup & Environment
load_dotenv()
user = urllib.parse.quote_plus(os.getenv("DB_USER"))
password = urllib.parse.quote_plus(os.getenv("DB_PASS"))
cluster = os.getenv("DB_CLUSTER")
db_name = os.getenv("DB_NAME")

# 2. Database Connection
uri = f"mongodb+srv://{user}:{password}@{cluster}/{db_name}?retryWrites=true&w=majority"
client = AsyncIOMotorClient(uri)
db = client.get_default_database()
vocab_col = db.vocabulary

# 3. Initialize Tokenizer Logic
tokenizer = AdvancedWordTokenizer()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- BACKGROUND WORKER ---

async def background_worker(url: str):
    """Processes scraping and updates the database using Advanced Tokenization."""
    print(f"📡 Background Worker: Scraping {url}...")
    
    # This uses your class logic (lowercase, regex, freq > 2)
    frequent_tokens = WebScraper.get_clean_words(url)
    
    # Determine the next available ID
    last_doc = await vocab_col.find_one(sort=[("id", -1)])
    current_id = last_doc["id"] if last_doc else 1000

    new_entries = 0
    for token in frequent_tokens:
        # Check if the token already exists in Atlas
        exists = await vocab_col.find_one({"word": token})
        if not exists:
            current_id += 1
            await vocab_col.insert_one({"word": token, "id": current_id})
            new_entries += 1
    
    print(f"✅ Training Complete: Added {new_entries} new tokens to Atlas.")
    for connection in active_connections:
        await connection.send_json({
            "type": "SCRAPE_COMPLETE",
            "message": "New words learned!"
        })

# --- API ENDPOINTS ---

@app.post("/api/scrape")
async def trigger_scrape(request: dict, background_tasks: BackgroundTasks):
    """Receives URL from ScrapePanel.tsx and starts the background task."""
    url = request.get("url")
    if not url:
        return {"error": "Invalid URL"}, 400
        
    background_tasks.add_task(background_worker, url)
    return {"status": "processing", "message": "Scraper started"}

@app.get("/api/vocab-size")
async def get_vocab_size():
    count = await vocab_col.count_documents({})
    return {"vocab_size": count}

@app.websocket("/ws/tokenize")
async def websocket_endpoint(websocket: WebSocket):
    """Handles real-time tokenization as the user types."""
    await websocket.accept()
    active_connections.add(websocket)
    try:
        while True:
            # Receive raw text from React
            data = await websocket.receive_text()
            input_text = json.loads(data).get("text", "")
            
            # Use your Advanced Tokenizer regex to split the text
            # This ensures 'don't' stays 'don't' and '.' becomes a token
            tokens = tokenizer.tokenize_text(input_text)
            
            processed_results = []
            for t in tokens:
                # Find token in cloud DB
                doc = await vocab_col.find_one({"word": t.lower()})
                
                # Default to ID 1 (<UNK>) if not found
                token_id = doc["id"] if doc else 1
                
                # Assign colors based on token type
                color = "text-blue-300 bg-blue-500/10" # Default
                if any(char.isdigit() for char in t):
                    color = "text-yellow-300 bg-yellow-500/10" # Numbers
                elif any(char in '.,!?;:()[]' for char in t):
                    color = "text-pink-300 bg-pink-500/10" # Punctuation

                processed_results.append({
                    "text": t,
                    "id": token_id,
                    "colorClass": color
                })

            # Get latest count for the "Live Vocab" display
            vocab_size = await vocab_col.count_documents({})

            await websocket.send_json({
                "type": "TOKENS",
                "payload": processed_results,
                "vocab_size": vocab_size
            })
            
    except WebSocketDisconnect:
        active_connections.remove(websocket)
        print("🔌 WebSocket closed by client.")

app = app