import React from "react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";

const Header: React.FC = () => {
  const navLinks = [
    { name: "Docs", href: "#" },
    { name: "API reference", href: "#" },
  ];

  return (
    /* FIXED TO TOP: added 'fixed top-0 left-0 w-full z-50' */
    <nav className="fixed top-0 left-0 w-full z-50 flex items-center justify-between bg-black px-4 py-3 md:px-6 lg:px-8 text-white border-b border-zinc-800">
      
      {/* --- LEFT SECTION --- */}
      <div className="flex items-center gap-1 md:gap-1.5 shrink-0">
        <span className="text-lg md:text-xl font-bold tracking-tight">AlumnxAI</span>
        <span className="text-base md:text-lg font-medium">Platform</span>
      </div>

      {/* --- RIGHT SECTION --- */}
      <div className="flex items-center gap-2 md:gap-6">
        
        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              {link.name}
            </a>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="bg-zinc-800 text-white hover:bg-zinc-700 h-8 px-2.5 md:px-3 text-xs md:text-sm border-none"
          >
            Log in
          </Button>
          
          <Button
            variant="default"
            className="hidden sm:flex bg-white text-black hover:bg-zinc-200 h-8 px-2.5 md:px-3 text-xs md:text-sm border-none"
          >
            Sign up
          </Button>
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-zinc-900 h-9 w-9 p-0">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-black text-white border-zinc-800 w-[280px] sm:w-[350px]">
              <div className="flex flex-col items-center mt-20 h-full">
                <SheetTitle className="text-white text-xl font-bold mb-12 text-center">Menu</SheetTitle>
                <div className="flex flex-col items-center gap-3 w-full">
                  {navLinks.map((link) => (
                    <a 
                      key={link.name} 
                      href={link.href} 
                      className="text-lg font-medium text-zinc-300 hover:text-white transition-colors py-2 text-center"
                    >
                      {link.name}
                    </a>
                  ))}
                  <div className="border-t border-zinc-800 pt-8 mt-4 w-full px-6">
                    <Button className="w-full bg-white text-black hover:bg-zinc-200 h-11 font-semibold text-base">
                      Sign up
                    </Button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Header;