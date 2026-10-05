const fs = require('fs');
let content = fs.readFileSync('src/components/TutorManager.tsx', 'utf-8');

const newEmojiList = `const EMOJI_PRESETS = [
  "👨‍🏫", "👩‍🏫", "👨‍🔬", "👩‍🔬", "🧙‍♂️", "🧙‍♀️", "🧚‍♀️", "🧛‍♂️",
  "🦊", "🦁", "🐯", "🐶", "🐱", "🐼", "🐨", "🐸",
  "🦉", "🦄", "🐙", "🦖", "🐢", "🦋", "🐞", "🐝",
  "🤖", "👾", "👽", "👻", "🤡", "💩", "💀", "🎃",
  "👑", "🎩", "🧢", "🎓", "🦸‍♂️", "🦸‍♀️", "🥷", "🕵️‍♂️",
  "🍎", "🌍", "🪐", "⭐", "🔥", "💧", "⚡", "❄️",
  "📚", "🎨", "🎭", "🧩", "🔮", "💡", "🔬", "🔭"
];`;

content = content.replace(/const EMOJI_PRESETS = \[.*?\];/s, newEmojiList);

fs.writeFileSync('src/components/TutorManager.tsx', content);
console.log("TutorManager EMOJI_PRESETS properly patched");
