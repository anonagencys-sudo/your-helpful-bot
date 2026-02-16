import sampleGamble from "@/assets/sample-gamble.jpg";
import sampleCto from "@/assets/sample-cto.jpg";
import sampleVolume from "@/assets/sample-volume.jpg";
import sampleGooddev from "@/assets/sample-gooddev.jpg";
import sampleAlpha from "@/assets/sample-alpha.jpg";

const cards = [
  { name: "GAMBLE (Purple)", src: sampleGamble },
  { name: "CTO (Cyan)", src: sampleCto },
  { name: "VOLUME (Orange)", src: sampleVolume },
  { name: "GOOD DEV (Green)", src: sampleGooddev },
  { name: "ALPHA (Gold)", src: sampleAlpha },
];

const Index = () => (
  <div className="min-h-screen bg-black p-8">
    <h1 className="text-3xl font-bold text-white text-center mb-8">New Card Designs — Anime Style</h1>
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
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
