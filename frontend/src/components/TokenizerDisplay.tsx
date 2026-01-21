import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Token {
    text: string;
    id: number;
    colorClass: string;
}

const TokenizerDisplay = ({ tokens }: { tokens: Token[] }) => {
    const [viewMode, setViewMode] = useState<"text" | "ids">("text");

    return (
        <div className="w-full">
            <div className="relative w-full min-h-[240px] bg-black/50 border border-zinc-800 rounded-lg p-8 pb-20 font-mono shadow-inner overflow-hidden">

                {tokens.length > 0 ? (
                    viewMode === "text" ? (
                        /* TEXT HIGHLIGHT VIEW */
                        <div className="flex flex-wrap items-start content-start gap-y-1.5 text-sm animate-in fade-in duration-300">
                            {tokens.map((token, index) => (
                                <span
                                    key={index}
                                    className={cn(
                                        "px-0.5 rounded transition-colors duration-150 whitespace-pre-wrap",
                                        token.colorClass
                                    )}
                                >
                                    {token.text}
                                </span>
                            ))}
                        </div>
                    ) : (
                        /* TOKEN IDS ARRAY VIEW */
                        <div className="text-xl md:text-sm leading-relaxed animate-in fade-in duration-300">
                            <span className="text-zinc-500">[</span>
                            {tokens.map((token, index) => (
                                <React.Fragment key={index}>
                                    <span className="text-white font-mono">
                                        {token.id}
                                    </span>
                                    {index < tokens.length - 1 && (
                                        <span className="text-zinc-500 mr-2">,</span>
                                    )}
                                </React.Fragment>
                            ))}
                            <span className="text-zinc-500">]</span>
                        </div>
                    )
                ) : (
                    <div className="h-full flex items-center justify-center">
                        
                    </div>
                )}

                {/* --- BUTTONS PINNED TO BOTTOM LEFT --- */}
                <div className="absolute bottom-6 left-8 flex items-center bg-black/60 backdrop-blur-md p-1 rounded-md border border-zinc-800 z-10 shadow-xl">
                    <Button
                        onClick={() => setViewMode("text")}
                        variant="ghost"
                        className={cn(
                            "h-7 text-[10px] uppercase tracking-widest px-4 font-bold rounded-sm transition-all",
                            viewMode === "text"
                                ? "bg-zinc-700 text-white"
                                : "text-zinc-500 hover:text-zinc-300 hover:bg-transparent"
                        )}
                    >
                        Text
                    </Button>
                    <Button
                        onClick={() => setViewMode("ids")}
                        variant="ghost"
                        className={cn(
                            "h-7 text-[10px] uppercase tracking-widest px-4 font-bold rounded-sm transition-all",
                            viewMode === "ids"
                                ? "bg-zinc-700 text-white"
                                : "text-zinc-500 hover:text-zinc-300 hover:bg-transparent"
                        )}
                    >
                        Token IDs
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default TokenizerDisplay;