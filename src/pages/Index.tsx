import demoMinimal from "@/assets/demo-card-minimal.jpg";
import demoCyberpunk from "@/assets/demo-card-cyberpunk.jpg";
import demoGlass from "@/assets/demo-card-glass.jpg";
import demoGold from "@/assets/demo-card-gold.jpg";

const cards = [
  { name: "Minimal", src: demoMinimal },
  { name: "Cyberpunk", src: demoCyberpunk },
  { name: "Glass", src: demoGlass },
  { name: "Gold", src: demoGold },
];

const Index = () => (
  <div className="min-h-screen bg-black p-8">
    <h1 className="text-3xl font-bold text-white text-center mb-8">Card Design Options</h1>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
      {cards.map((c) => (
        <div key={c.name} className="flex flex-col items-center gap-3">
          <img src={c.src} alt={c.name} className="w-full rounded-xl border border-white/10" />
          <span className="text-white text-lg font-semibold">{c.name}</span>
        </div>
      ))}
    </div>
  </div>
);

export default Index;
