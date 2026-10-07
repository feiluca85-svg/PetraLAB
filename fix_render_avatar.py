import re
import os

avatar_component = """
export function TutorAvatar({ avatar, className = "" }: { avatar: string, className?: string }) {
  if (avatar?.startsWith('/avatars/')) {
    return <img src={avatar} alt="avatar" className={`w-full h-full object-contain drop-shadow-md ${className}`} />;
  }
  return <span className={`drop-shadow-md ${className}`}>{avatar}</span>;
}
"""

def update_file(filepath):
    if not os.path.exists(filepath): return
    with open(filepath, 'r') as f:
        c = f.read()

    # We need to add the import or component.
    # Actually, to make it easier, let's just use inline conditionals where it's used.
    
    # 1. Chat.tsx
    if 'Chat.tsx' in filepath:
        # For the tutor list in chat
        c = re.sub(
            r'<span className="drop-shadow-md transform transition-transform hover:scale-110">\{tutor\.avatar\}</span>',
            r'{tutor.avatar?.startsWith("/avatars/") ? <img src={tutor.avatar} alt="avatar" className="w-[85%] h-[85%] object-contain drop-shadow-md transform transition-transform hover:scale-110" /> : <span className="drop-shadow-md transform transition-transform hover:scale-110">{tutor.avatar}</span>}',
            c
        )
        
        # For the chat header
        c = re.sub(
            r'<span className="drop-shadow-md">\{selectedTutor\.avatar\}</span>',
            r'{selectedTutor.avatar?.startsWith("/avatars/") ? <img src={selectedTutor.avatar} alt="avatar" className="w-[85%] h-[85%] object-contain drop-shadow-md" /> : <span className="drop-shadow-md">{selectedTutor.avatar}</span>}',
            c
        )
        
        # For the chat modal
        c = re.sub(
            r'<span className=\{`text-3xl p-2 rounded-2xl .*?`\}>\{selectedTutor\.avatar\}</span>',
            r'{selectedTutor.avatar?.startsWith("/avatars/") ? <img src={selectedTutor.avatar} alt="avatar" className={`w-14 h-14 p-1 rounded-2xl object-contain drop-shadow-md ${isDarkMode ? "bg-[#202C33]" : "bg-[#F0F2F5]"}`} /> : <span className={`text-3xl p-2 rounded-2xl ${isDarkMode ? "bg-[#202C33]" : "bg-[#F0F2F5]"}`}>{selectedTutor.avatar}</span>}',
            c
        )

    # 2. TutorManager.tsx
    if 'TutorManager.tsx' in filepath:
        # In the tutor list
        c = re.sub(
            r'<span className="drop-shadow-md transform transition-transform hover:scale-110">\{tutor\.avatar\}</span>',
            r'{tutor.avatar?.startsWith("/avatars/") ? <img src={tutor.avatar} alt="avatar" className="w-[85%] h-[85%] object-contain drop-shadow-md transform transition-transform hover:scale-110" /> : <span className="drop-shadow-md transform transition-transform hover:scale-110">{tutor.avatar}</span>}',
            c
        )
        
    # 3. ParentDashboard.tsx
    if 'ParentDashboard.tsx' in filepath:
        c = re.sub(
            r'<span className="text-2xl drop-shadow-md">\{tutor\.avatar\}</span>',
            r'{tutor.avatar?.startsWith("/avatars/") ? <img src={tutor.avatar} alt="avatar" className="w-8 h-8 object-contain drop-shadow-md" /> : <span className="text-2xl drop-shadow-md">{tutor.avatar}</span>}',
            c
        )

    with open(filepath, 'w') as f:
        f.write(c)

for f in ['src/components/Chat.tsx', 'src/components/TutorManager.tsx', 'src/components/ParentDashboard.tsx']:
    update_file(f)

print("Avatar rendering logic updated.")
