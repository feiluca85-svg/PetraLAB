import re

with open('src/components/Chat.tsx', 'r') as f:
    c = f.read()

old_str = r'<span className="text-base">\{matchingTutor\.avatar\}</span> Parla col Tutor'
new_str = r'{matchingTutor.avatar?.startsWith("/avatars/") ? <img src={matchingTutor.avatar} alt="avatar" className="w-5 h-5 object-contain" /> : <span className="text-base">{matchingTutor.avatar}</span>} Parla col Tutor'

c = re.sub(old_str, new_str, c)

with open('src/components/Chat.tsx', 'w') as f:
    f.write(c)

print("Agenda avatar fixed.")
