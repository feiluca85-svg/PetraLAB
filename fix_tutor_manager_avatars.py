import re

with open('src/components/TutorManager.tsx', 'r') as f:
    c = f.read()

# Replace EMOJI_CATEGORIES with the new list
new_categories = """const EMOJI_CATEGORIES = [
  {
    label: "Avatar 3D",
    emojis: Array.from({length: 80}, (_, i) => `/avatars/avatar_${i}.png`)
  },
  {
    label: "Lingue e Bandiere",
    emojis: ["🇮🇹", "🇬🇧", "🇺🇸", "🇫🇷", "🇪🇸", "🇩🇪", "🇨🇳", "🇯🇵", "🇷🇺", "🇧🇷", "🌐", "💬", "🗣️"]
  }
];
"""

c = re.sub(r'const EMOJI_CATEGORIES = \[\s*\{.*?\];\n', new_categories, c, flags=re.DOTALL)

# In the render block for avatars, we need to handle the image display inside the button!
# Current button content: {emoji}
old_btn_content = r">\{emoji\}</button>"
new_btn_content = r">{emoji.startsWith('/avatars/') ? <img src={emoji} alt=\"avatar\" className=\"w-full h-full object-contain\" /> : emoji}</button>"
c = re.sub(old_btn_content, new_btn_content, c)

with open('src/components/TutorManager.tsx', 'w') as f:
    f.write(c)

print("TutorManager updated with 3D avatars.")
