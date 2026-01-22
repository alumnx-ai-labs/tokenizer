import React, { useState } from 'react';
import { Button } from "@/components/ui/button"; // Existing
import { Input } from "@/components/ui/input";   // Newly installed

const ScraperSection: React.FC = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleScrape = async () => {
    if (!url) return;
    setLoading(true);
    
    try {
      const response = await fetch("http://13.232.82.217:8000/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      
      if (response.ok) {
        setUrl("");
      }
    } catch (err) {
      console.error("Scrape failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <h2 className="text-lg md:text-xl font-bold text-white">Increase Vocab</h2>
      
      <div className="flex gap-2 w-full">
        <Input 
          type="text" 
          placeholder="Paste URL to learn from..."
          className="flex-1 bg-[#1a1a1a] border-zinc-500 text-white focus-visible:ring-zinc-400 h-10"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Button 
          onClick={handleScrape}
          disabled={loading || !url}
          className="bg-zinc-800 hover:bg-zinc-700 text-white h-10 px-6 text-xs font-semibold border border-zinc-700 transition-colors"
        >
          {loading ? "Learning..." : "Scrape & Learn"}
        </Button>
      </div>
    </div>
  );
};

export default ScraperSection;