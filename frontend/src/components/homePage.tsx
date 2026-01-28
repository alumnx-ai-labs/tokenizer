import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import TokenizerDisplay from "./tokenizerdisplay";
import ScraperSection from "./scrapersection";


interface TokenData {
  text: string;
  id: number;
  colorClass: string;
}

const HomePage = () => {
  const [text, setText] = useState('');
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [vocabSize, setVocabSize] = useState(0);
  const socket = useRef<WebSocket | null>(null);

  useEffect(() => {
    const fetchInitialVocab = async () => {
      try {
        const response = await fetch("https://my-tokenizer.duckdns.org/api/vocab-size");
        const data = await response.json();
        setVocabSize(data.vocab_size);
      } catch (err) {
        console.error("Initial vocab fetch failed", err);
      }
    };

    fetchInitialVocab();
  }, []); // Empty dependency array means "run once on mount"

  useEffect(() => {
    socket.current = new WebSocket("wss://my-tokenizer.duckdns.org/ws/tokenize");

    socket.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "TOKENS") {
        setTokens(data.payload);
        setVocabSize(data.vocab_size); 
      }
    // NEW: When learning is done, force a re-check of current text
    if (data.type === "SCRAPE_COMPLETE") {
      fetch("https://my-tokenizer.duckdns.org/api/vocab-size")
        .then(res => res.json())
        .then(data => setVocabSize(data.vocab_size));
    if (text && socket.current?.readyState === WebSocket.OPEN) {
      socket.current.send(JSON.stringify({ text }));
    }
  }
    };

    return () => socket.current?.close();
  }, []);

  useEffect(() => {
    if (!text) {
      setTokens([]);
      return;
    }
    if (socket.current?.readyState === WebSocket.OPEN) {
      socket.current.send(JSON.stringify({ text }));
    }
  }, [text]);

  return (
    <div className="w-full min-h-screen">
      <div className="flex flex-col gap-3 md:gap-4 max-w-10xl mx-auto py-2 px-4 md:px-6 w-full">
        
        {/* --- TOP SECTION: TRAINING HUB & VOCAB COUNTER --- */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start border-b border-zinc-800 pb-6 mb-2">
          {/* URL Scraper Box */}
          <div className="md:col-span-3">
             < ScraperSection/>
          </div>

          {/* Real-time Vocab Stat Card */}
          <div className="bg-[#1a1a1a] p-4 rounded-lg border border-zinc-500 h-[100px] flex flex-col justify-center items-center shadow-inner">
            <p className="text-[10px] md:text-xs font-bold text-zinc-400 uppercase tracking-widest">Live Vocab Size</p>
            <p className="text-2xl md:text-3xl font-mono text-white font-bold tracking-tighter">
              {vocabSize.toLocaleString()}
            </p>
          </div>
        </section>

        {/* Section 1: Introduction */}
        <section className="space-y-4 md:space-y-6 w-full mt-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Tokenizer</h1>
          <div className="space-y-3 md:space-y-4 text-zinc-300">
            <h2 className="text-lg md:text-xl font-bold text-white">Learn about language model tokenization</h2>
            <p className="leading-relaxed text-sm md:text-[15px]">
              AlumnxAI's large language models process text using <span className="font-bold text-white">tokens</span>, 
              which are common sequences of characters found in a set of text.
            </p>
          </div>
        </section>

        {/* Section 2: Input Controls */}
        <section className="space-y-3 md:space-y-4 w-full">
          <Tabs defaultValue="alumnx1" className="w-full">
            <TabsList className="bg-black/50 border border-zinc-800 p-1 h-auto gap-1 justify-start">
              <TabsTrigger value="alumnx1" className="px-3 md:px-4 py-1.5 text-xs font-semibold data-[state=active]:bg-zinc-700">AlumnxLLM 1.0</TabsTrigger>
              <TabsTrigger value="alumnx2" className="px-3 md:px-4 py-1.5 text-xs font-semibold data-[state=active]:bg-zinc-700">AlumnxLLM 2.0</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative group w-full">
            <Textarea 
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full min-h-[180px] md:min-h-[240px] bg-[#1a1a1a] border-zinc-500 focus:border-zinc-400 text-base md:text-sm p-4 md:p-6 rounded-lg resize-none font-mono leading-relaxed"
              placeholder="Type here to see tokens update..."
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full">
            <Button variant="secondary" onClick={() => setText("")} className="bg-zinc-500 hover:bg-zinc-700 text-white h-8 px-4 text-xs font-semibold">
              Clear
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => setText("The quick brown fox jumps over the lazy dog.")}
              className="bg-zinc-800 hover:bg-zinc-700 text-white h-8 px-4 text-xs font-semibold"
            >
              Show example
            </Button>
          </div>
        </section>

        {/* Section 3: Token Stats */}
        <section className="flex gap-8 md:gap-16 pt-2 border-zinc-800 w-full">
          <div className="flex flex-col gap-1">
            <p className="text-base md:text-lg font-bold text-white">Tokens</p>
            <p className="text-xl md:text-2xl font-medium tracking-tighter text-white">{tokens.length}</p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-base md:text-lg font-bold text-white">Characters</p>
            <p className="text-xl md:text-2xl font-medium tracking-tighter text-white">{text.length}</p>
          </div>
        </section>

        {/* Section 4: Token Highlight View */}
        <section className="w-full">
          <TokenizerDisplay tokens={tokens} />
        </section>
      </div>
    </div>
  );
};

export default HomePage;