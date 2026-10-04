export type LevelInfo = {
  level: number;
  title: string;
  nextLevelXP: number | null;
  progress: number; // 0 to 100
};

const LEVELS = [
  { xpReq: 0, title: "Novellino 🌱" },
  { xpReq: 50, title: "Apprendista 📖" },
  { xpReq: 150, title: "Esploratore 🧭" },
  { xpReq: 300, title: "Studioso 🔬" },
  { xpReq: 500, title: "Saggio 🔮" },
  { xpReq: 1000, title: "Maestro 👑" },
];

export function getLevelInfo(xp: number): LevelInfo {
  let currentLevelIndex = 0;
  
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].xpReq) {
      currentLevelIndex = i;
    } else {
      break;
    }
  }

  const currentLevel = LEVELS[currentLevelIndex];
  const nextLevel = currentLevelIndex + 1 < LEVELS.length ? LEVELS[currentLevelIndex + 1] : null;
  
  let progress = 100;
  if (nextLevel) {
    const xpIntoLevel = xp - currentLevel.xpReq;
    const xpRequiredForNext = nextLevel.xpReq - currentLevel.xpReq;
    progress = Math.min(100, Math.max(0, (xpIntoLevel / xpRequiredForNext) * 100));
  }

  return {
    level: currentLevelIndex + 1,
    title: currentLevel.title,
    nextLevelXP: nextLevel ? nextLevel.xpReq : null,
    progress: progress,
  };
}
