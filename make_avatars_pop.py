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

    # 2. Modernize Avatars (Make them vibrant instead of dull grey)
    old_avatar_light = r"bg-gradient-to-br from-emerald-50 to-teal-100/50 shadow-inner"
    old_avatar_dark = r"bg-gradient-to-br from-\[\#182229\] to-\[\#202C33\] shadow-inner"
    
    # New vibrant modern avatar background (Apple Memoji style pastel/vibrant gradients)
    new_avatar_light = r"bg-gradient-to-br from-emerald-100 via-teal-100 to-cyan-100 shadow-sm border border-white/50"
    new_avatar_dark = r"bg-gradient-to-br from-emerald-900/60 via-teal-800/60 to-cyan-900/60 shadow-sm border border-white/10"
    
    c = re.sub(old_avatar_light, new_avatar_light, c)
    c = re.sub(old_avatar_dark, new_avatar_dark, c)

    # 3. Brighten the User Chat Bubble in Dark Mode (user thinks #005C4B is "smorto")
    # WA dark mode is #005C4B. We'll use a brighter vibrant green, e.g., #00A884 or #128C7E.
    # Let's use #00A884 for user bubbles in dark mode, and keep #D9FDD3 for light mode.
    c = c.replace('bg-[#005C4B]', 'bg-[#00A884]')

    # 4. Make sure the Home header in Chat.tsx doesn't have old dull backgrounds
    # (Already handled, it uses transparent/bg-white/bg-dark)

    with open(filepath, 'w') as f:
        f.write(c)

for f in ['src/components/Chat.tsx', 'src/components/TutorManager.tsx', 'src/components/ParentDashboard.tsx']:
    update_file(f)

print("Avatars and bubbles modernized, version synced to v1.9.0")
