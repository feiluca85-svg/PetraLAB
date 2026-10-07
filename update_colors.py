import os
import re

files_to_update = [
    'src/components/ParentDashboard.tsx',
    'src/components/TutorManager.tsx',
    'src/components/AppShell.tsx'
]

replacements = [
    ('#00A884', '#25D366'),
    ('text-[#1DA851]', 'text-[#25D366]'),
    ('emerald-500', '[#25D366]'),
    ('emerald-600', '[#25D366]'),
    ('emerald-800', '[#118B44]'),
    ('bg-[#111B21]', 'bg-[#0B141A]'),  # WA Dark bg
    ('border-[#222E35]', 'border-[#202C33]'),
    ('bg-[#202C33]', 'bg-[#182229]'),   # WA Dark secondary bg
]

for filepath in files_to_update:
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            content = f.read()
        for old, new in replacements:
            content = content.replace(old, new)
        
        # specific tweaks for TutorManager modern UI
        if 'TutorManager.tsx' in filepath:
            content = content.replace('rounded-xl', 'rounded-[20px]')
            content = content.replace('rounded-lg', 'rounded-[16px]')
            
        # specific tweaks for ParentDashboard modern UI
        if 'ParentDashboard.tsx' in filepath:
            content = content.replace('rounded-xl', 'rounded-[20px]')
            content = content.replace('rounded-2xl', 'rounded-[24px]')
            content = content.replace('shadow-md', 'shadow-sm')
            
        with open(filepath, 'w') as f:
            f.write(content)
print("Colors updated across all tabs.")
