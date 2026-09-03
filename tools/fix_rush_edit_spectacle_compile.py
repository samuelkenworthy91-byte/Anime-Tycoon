from pathlib import Path

p = Path(__file__).resolve().parents[1] / "game_source/src/components/Produce.tsx"
s = p.read_text()
s = s.replace("import { Building2, ChevronLeft, MonitorPlay, Music4, PenTool, Scissors, UserRound } from \"lucide-react\";", "import { Building2, ChevronLeft, MonitorPlay, Music4, PenTool, Scissors } from \"lucide-react\";")
p.write_text(s)
print("Removed obsolete rush lead icon import")
