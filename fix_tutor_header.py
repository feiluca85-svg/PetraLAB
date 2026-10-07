import re

with open('src/components/TutorManager.tsx', 'r') as f:
    c = f.read()

old_header = r'<span className="text-2xl">\{formData\.avatar \|\| "🦉"\}</span>'
new_header = r"""{formData.avatar?.startsWith('/avatars/') ? <img src={formData.avatar} alt="avatar" className="w-8 h-8 object-contain" /> : <span className="text-2xl">{formData.avatar || "🦉"}</span>}"""

c = re.sub(old_header, new_header, c)

with open('src/components/TutorManager.tsx', 'w') as f:
    f.write(c)

print("Modal header fixed.")
