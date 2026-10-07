import re

with open('src/components/TutorManager.tsx', 'r') as f:
    c = f.read()

# Replace the inner content of the button
old_content = r"                          >\n                            \{emoji\}\n                          </button>"
new_content = r"""                          >
                            {emoji.startsWith('/avatars/') ? <img src={emoji} alt="avatar" className="w-full h-full object-contain drop-shadow-sm" /> : emoji}
                          </button>"""

c = re.sub(old_content, new_content, c, flags=re.MULTILINE)

with open('src/components/TutorManager.tsx', 'w') as f:
    f.write(c)

print("TutorManager button fixed.")
