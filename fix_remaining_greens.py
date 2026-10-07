import os
files = ['src/components/Chat.tsx', 'src/components/ParentDashboard.tsx', 'src/components/TutorManager.tsx', 'src/components/AppShell.tsx']
for file in files:
    if os.path.exists(file):
        with open(file, 'r') as f:
            c = f.read()
        c = c.replace('#008069', '#25D366')
        c = c.replace('#00705c', '#118B44')
        c = c.replace('bg-emerald-600', 'bg-[#25D366]')
        c = c.replace('bg-emerald-700', 'bg-[#118B44]')
        c = c.replace('text-emerald-700', 'text-[#118B44]')
        c = c.replace('text-[#1DA851]', 'text-[#25D366]')
        with open(file, 'w') as f:
            f.write(c)
print("Greens updated.")
