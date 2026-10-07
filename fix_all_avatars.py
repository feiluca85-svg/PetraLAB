import os
import re

def update_file(filepath):
    if not os.path.exists(filepath): return
    with open(filepath, 'r') as f:
        c = f.read()
    
    # 1. Update Version
    c = c.replace('v1.8.0', 'v1.9.0')
    c = c.replace('v1.5.0', 'v1.9.0')
    c = c.replace('v1.6.0', 'v1.9.0')
    c = c.replace('v1.7.0', 'v1.9.0')

    # Aggressive avatar replacements
    old_light_regex = r"bg-gradient-to-br from-emerald-50 to-teal-100/50( shadow-[a-z]+)?"
    old_dark_regex = r"bg-gradient-to-br from-\[\#182229\] to-\[\#202C33\]( shadow-[a-z]+)?"
    
    new_avatar_light = r"bg-gradient-to-br from-emerald-100 via-teal-100 to-cyan-100 shadow-sm border border-white/50"
    new_avatar_dark = r"bg-gradient-to-br from-emerald-900/60 via-teal-800/60 to-cyan-900/60 shadow-sm border border-white/10"
    
    c = re.sub(old_light_regex, new_avatar_light, c)
    c = re.sub(old_dark_regex, new_avatar_dark, c)
    
    # Fix the Modal header avatar
    c = c.replace(
        '<span className="text-3xl bg-slate-100 p-2 rounded-2xl">{selectedTutor.avatar}</span>',
        '<span className={`text-3xl p-2 rounded-2xl ${isDarkMode ? "bg-gradient-to-br from-emerald-900/60 via-teal-800/60 to-cyan-900/60" : "bg-gradient-to-br from-emerald-100 via-teal-100 to-cyan-100"}`}>{selectedTutor.avatar}</span>'
    )

    with open(filepath, 'w') as f:
        f.write(c)

for f in ['src/components/Chat.tsx', 'src/components/TutorManager.tsx', 'src/components/ParentDashboard.tsx']:
    update_file(f)

print("All avatars perfectly aligned!")
