const fs = require('fs');

// 1. UPDATE Chat.tsx Date Format
let chatTs = fs.readFileSync('src/components/Chat.tsx', 'utf-8');
chatTs = chatTs.replace(
  "day: 'numeric', month: 'long', year: 'numeric'",
  "weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'"
);
// Capitalize the first letter of the weekday to make it look nicer
chatTs = chatTs.replace(
  "return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });",
  "const dateStr = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });\\n                            return dateStr.charAt(0).toUpperCase() + dateStr.slice(1);"
);
fs.writeFileSync('src/components/Chat.tsx', chatTs);
console.log("Chat.tsx date format patched");

// 2. UPDATE TutorManager.tsx Emojis
let tutorTs = fs.readFileSync('src/components/TutorManager.tsx', 'utf-8');
const oldEmojiRegex = /const EMOJI_LIST = \[.*?\];/s;
const newEmojiList = `const EMOJI_LIST = [
  "👨‍🏫", "👩‍🏫", "👨‍🔬", "👩‍🔬", "🧙‍♂️", "🧙‍♀️", "🧚‍♀️", "🧛‍♂️",
  "🦊", "🦁", "🐯", "🐶", "🐱", "🐼", "🐨", "🐸",
  "🦉", "🦄", "🐙", "🦖", "🐢", "🦋", "🐞", "🐝",
  "🤖", "👾", "👽", "👻", "🤡", "💩", "💀", "🎃",
  "👑", "🎩", "🧢", "🎓", "🦸‍♂️", "🦸‍♀️", "🥷", "🕵️‍♂️",
  "🍎", "🌍", "🪐", "⭐", "🔥", "💧", "⚡", "❄️",
  "📚", "🎨", "🎭", "🧩", "🔮", "💡", "🔬", "🔭"
];`;
tutorTs = tutorTs.replace(oldEmojiRegex, newEmojiList);
fs.writeFileSync('src/components/TutorManager.tsx', tutorTs);
console.log("TutorManager.tsx emojis patched");

