import re

with open('src/components/TutorManager.tsx', 'r') as f:
    c = f.read()

# Replace EMOJI_CATEGORIES
new_categories = """const EMOJI_CATEGORIES = [
  {
    label: "Avatar 3D",
    emojis: Array.from({length: 40}, (_, i) => `/avatars/avatar_${i}.png`)
  },
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
];
"""

# We need to replace the current EMOJI_CATEGORIES definition
c = re.sub(r'const EMOJI_CATEGORIES = \[\s*\{\s*label: "Avatar 3D".*?\];\n', new_categories, c, flags=re.DOTALL)

with open('src/components/TutorManager.tsx', 'w') as f:
    f.write(c)

print("Categories restored.")
