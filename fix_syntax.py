with open('src/components/Chat.tsx', 'r') as f:
    content = f.read()

bad = "<div className={`flex-1 overflow-y-auto ${isDarkMode ? 'bg-[#0B141A]' : 'bg-white'}` ${listFilter === 'tutte' ? 'divide-y' : ''} ${isDarkMode ? 'divide-[#222E35]' : 'divide-slate-100'}`}>"
good = "<div className={`flex-1 overflow-y-auto ${isDarkMode ? 'bg-[#0B141A]' : 'bg-white'} ${listFilter === 'tutte' ? 'divide-y' : ''} ${isDarkMode ? 'divide-[#222E35]' : 'divide-slate-100'}`}>"

content = content.replace(bad, good)
with open('src/components/Chat.tsx', 'w') as f:
    f.write(content)
print("Syntax fixed!")
