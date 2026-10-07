with open('src/components/ParentDashboard.tsx', 'r') as f:
    content = f.read()

# The tutor selection pills
content = content.replace(
    '<span className="text-2xl">{tutor.avatar}</span>',
    '<span className="text-2xl drop-shadow-md">{tutor.avatar}</span>'
)
content = content.replace(
    'isDarkMode ? "bg-[#202C33] border-[#2A3942]" : "bg-white border-slate-200"',
    'isDarkMode ? "bg-gradient-to-br from-[#182229] to-[#202C33] border-[#2A3942]" : "bg-gradient-to-br from-emerald-50 to-teal-100/50 border-slate-200"'
)

with open('src/components/ParentDashboard.tsx', 'w') as f:
    f.write(content)
print("Parent avatars fixed!")
