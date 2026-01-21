// App.tsx
import Header from "./components/header";
import HomePage from "./components/homepage";

function App() {
  return (
    <div className="min-h-screen bg-[#1a1a1a] text-zinc-100 selection:bg-zinc-700">
      <Header />
      {/* Centering Wrapper: max-w-5xl and mx-auto are the keys here */}
      <main className="pt-16 md:pt-24 pb-12 md:pb-20 px-4 md:px-8 lg:px-50 max-w-[1100px] mx-auto">
        <HomePage/>
      </main>
    </div>
  );
}

export default App;