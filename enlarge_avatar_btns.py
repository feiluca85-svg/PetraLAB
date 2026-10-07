import re

with open('src/components/TutorManager.tsx', 'r') as f:
    c = f.read()

# Change w-9 h-9 to w-12 h-12 for better visibility
c = re.sub(
    r'className={`w-9 h-9 flex items-center justify-center text-xl rounded-\[16px\] transition-transform',
    r'className={`w-11 h-11 flex items-center justify-center text-xl rounded-[16px] p-1 transition-transform',
    c
)

with open('src/components/TutorManager.tsx', 'w') as f:
    f.write(c)

print("Avatar buttons enlarged.")
