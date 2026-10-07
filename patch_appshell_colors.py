import re
with open('src/components/AppShell.tsx', 'r') as f:
    content = f.read()

# Update background and border colors
content = content.replace('bg-[#00A884]', 'bg-[#25D366]')
content = content.replace('text-[#00A884]', 'text-[#25D366]')
content = content.replace('border-[#00A884]', 'border-[#25D366]')

content = content.replace('bg-[#111B21]', 'bg-[#0B141A]')
content = content.replace('border-[#222E35]', 'border-[#202C33]')
content = content.replace('bg-[#202C33]', 'bg-[#182229]')

# Replace active background for nav icons
content = content.replace('bg-[#25D366]/25 text-[#25D366]', 'bg-[#0A291A] text-[#25D366]')
content = content.replace('bg-[#D8FDD2] text-[#0A332C]', 'bg-[#E7FCEB] text-[#118B44]')

with open('src/components/AppShell.tsx', 'w') as f:
    f.write(content)
print("AppShell colors updated to WA 2024!")
