const fs = require('fs');
let content = fs.readFileSync('src/components/TutorManager.tsx', 'utf-8');

const regex = /const EMOJI_CATEGORIES = \[[\s\S]*?\];/s;

const newCategories = `const EMOJI_CATEGORIES = [
  {
    label: "Persone e Tutor",
    emojis: ["👨‍🏫", "👩‍🏫", "👨‍🔬", "👩‍🔬", "👨‍💻", "👩‍💻", "👨‍🎓", "👩‍🎓", "👨‍💼", "👩‍💼", "🧙‍♂️", "🧙‍♀️", "🤓", "🧐", "😎", "🧠"]
  },
  {
    label: "Lingue e Bandiere",
    emojis: ["🇮🇹", "🇬🇧", "🇺🇸", "🇫🇷", "🇪🇸", "🇩🇪", "🇨🇳", "🇯🇵", "🇷🇺", "🇧🇷", "🌐", "💬", "🗣️"]
  },
  {
    label: "Studio e Materie",
    emojis: ["📚", "📖", "✏️", "📐", "📏", "🔬", "🔭", "⚗️", "🧬", "🌍", "🗺️", "💻", "⌨️", "🎨", "🎭", "🎵", "⚽", "🏀", "🏆", "🧩"]
  },
  {
    label: "Animali Simpatici",
    emojis: ["🦉", "🦊", "🦁", "🐶", "🐱", "🐼", "🐨", "🐸", "🐒", "🦄", "🐙", "🦖", "🐢", "🐝", "🦋"]
  },
  {
    label: "Fantasia e Natura",
    emojis: ["🤖", "👾", "👽", "👻", "🌟", "🔥", "💧", "⚡", "❄️", "🍀", "🌈", "☀️", "🌙"]
  }
];`;

content = content.replace(regex, newCategories);
fs.writeFileSync('src/components/TutorManager.tsx', content);
console.log("Emoji categories patched!");
