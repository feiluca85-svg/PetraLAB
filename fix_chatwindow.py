with open('src/components/Chat.tsx', 'r') as f:
    content = f.read()

# Fix Chat Window Background 
content = content.replace(
    'backgroundImage: isDarkMode ? "radial-gradient(#2A3942 0.75px, transparent 0.75px)" : "radial-gradient(#d3cbbf 0.75px, transparent 0.75px)",',
    'backgroundImage: isDarkMode ? "none" : "none",'
)
content = content.replace(
    'className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 relative"',
    'className={`flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 relative ${isDarkMode ? "bg-[#0B141A]" : "bg-[#EFEAE2]"}`}'
)

# Fix Chat Window Header
content = content.replace(
    'className={`px-4 py-3 flex items-center gap-3 border-b z-30 transition-colors shadow-sm ${',
    'className={`px-4 py-3 flex items-center gap-3 z-30 transition-colors shadow-sm ${'
)
content = content.replace(
    "isDarkMode ? 'bg-[#111B21] border-[#222E35]' : 'bg-[#008069] text-white border-transparent'",
    "isDarkMode ? 'bg-[#0B141A] text-white border-b border-[#202C33]' : 'bg-white text-slate-800 border-b border-slate-100'"
)
# Change the back arrow color in light mode to WhatsApp Green
content = content.replace(
    "isDarkMode ? 'text-gray-300 hover:bg-[#202C33]' : 'text-emerald-50 hover:bg-emerald-700/50'",
    "isDarkMode ? 'text-gray-300 hover:bg-[#202C33]' : 'text-[#25D366] hover:bg-slate-100'"
)
# Change text colors in the header
content = content.replace(
    "className={`font-bold text-[17px] truncate ${isDarkMode ? 'text-white' : 'text-white'}`}",
    "className={`font-bold text-[17px] truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}"
)
content = content.replace(
    "className={`text-xs font-medium truncate opacity-90 ${isDarkMode ? 'text-[#8696A0]' : 'text-emerald-100'}`}",
    "className={`text-[13px] font-medium truncate ${isDarkMode ? 'text-[#8696A0]' : 'text-slate-500'}`}"
)

# Fix Chat Window Input Bar
content = content.replace(
    "isDarkMode ? 'bg-[#202C33] border-t border-[#2A3942]' : 'bg-[#F0F2F5] border-t border-slate-200'",
    "isDarkMode ? 'bg-[#0B141A]' : 'bg-[#F0F2F5]'"
)
content = content.replace(
    "isDarkMode ? 'bg-[#2A3942] focus-within:border-[#25D366]' : 'bg-white focus-within:border-slate-300'",
    "isDarkMode ? 'bg-[#202C33] focus-within:border-[#25D366]' : 'bg-white focus-within:border-transparent'"
)

# Fix Avatars (Adding gradients to ALL avatars in the app)
content = content.replace(
    "isDarkMode ? \"bg-[#202C33]\" : \"bg-slate-100\"",
    "isDarkMode ? \"bg-gradient-to-br from-[#182229] to-[#202C33] shadow-inner\" : \"bg-gradient-to-br from-emerald-50 to-teal-100/50 shadow-inner\""
)
content = content.replace(
    '<span>{tutor.avatar}</span>',
    '<span className="drop-shadow-md transform transition-transform hover:scale-110">{tutor.avatar}</span>'
)
content = content.replace(
    '<span>{selectedTutor.avatar}</span>',
    '<span className="drop-shadow-md">{selectedTutor.avatar}</span>'
)

with open('src/components/Chat.tsx', 'w') as f:
    f.write(content)
print("ChatWindow updated.")
