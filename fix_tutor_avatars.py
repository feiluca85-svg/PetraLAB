with open('src/components/TutorManager.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "isDarkMode ? 'bg-[#0B141A] border border-[#2A3942]' : 'bg-slate-100 border border-slate-200'",
    "isDarkMode ? 'bg-gradient-to-br from-[#182229] to-[#202C33] shadow-inner' : 'bg-gradient-to-br from-emerald-50 to-teal-100/50 shadow-inner'"
)
content = content.replace(
    "{tutor.avatar}",
    "<span className=\"drop-shadow-md transform transition-transform hover:scale-110\">{tutor.avatar}</span>"
)

# And make the cards WA 2024 style
content = content.replace(
    "className={`p-4 rounded-[20px] border",
    "className={`p-4 rounded-[24px] border"
)

with open('src/components/TutorManager.tsx', 'w') as f:
    f.write(content)
print("TutorManager avatars updated.")
