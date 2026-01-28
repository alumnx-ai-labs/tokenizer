import os
import json
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import urllib.parse

load_dotenv()

async def migrate():
    # Connect to Atlas using the URI from your .env file
    user = os.getenv("DB_USER")
    password = urllib.parse.quote_plus(os.getenv("DB_PASS")) # <--- ENCODES SPECIAL CHARS
    cluster = os.getenv("DB_CLUSTER")
    db_name = os.getenv("DB_NAME")

    # 2. Build the safe URI
    uri = f"mongodb+srv://{user}:{password}@{cluster}/{db_name}?retryWrites=true&w=majority"
    client = AsyncIOMotorClient(uri)
    
    db = client.get_default_database() # Uses the DB name from the URI
    collection = db.vocabulary

    print("Connecting to Atlas...")
    await collection.delete_many({}) # Start fresh

    with open("wikipedia_tokenizer.json", "r") as f:
        data = json.load(f)
        word2idx = data.get("word2idx", {})

    docs = [{"word": word, "id": idx} for word, idx in word2idx.items()]

    if docs:
        # Atlas Free Tier has a limit on document size, 
        # so we insert in smaller chunks for safety
        chunk_size = 1000
        for i in range(0, len(docs), chunk_size):
            await collection.insert_many(docs[i:i + chunk_size])
            print(f"Uploaded {i + len(docs[i:i + chunk_size])} / {len(docs)}")
        
        await collection.create_index("word")
        print("✅ Atlas Migration Complete!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate())