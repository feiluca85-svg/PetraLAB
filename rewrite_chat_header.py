with open('src/components/Chat.tsx', 'r') as f:
    content = f.read()

# Replace the chat header background logic
old_header_bg = r"className={`${isDarkMode ? 'bg-[#202C33]' : 'bg-[#25D366]'} text-white px-3 py-2.5 flex items-center justify-between shadow-md z-20`}"
new_header_bg = r"className={`${isDarkMode ? 'bg-[#0B141A]' : 'bg-white'} px-3 py-2.5 flex items-center justify-between shadow-sm border-b ${isDarkMode ? 'border-[#202C33]' : 'border-slate-100'} z-20`}"
content = content.replace(old_header_bg, new_header_bg)

# Replace the back button logic
old_back_btn = r"""className="p-1 -ml-1 rounded-full hover:bg-black/10 transition-colors flex items-center gap-0.5 text-white" """
new_back_btn = r"""className={`p-1 -ml-1 rounded-full flex items-center gap-0.5 transition-colors ${isDarkMode ? 'text-gray-300 hover:bg-[#202C33]' : 'text-[#25D366] hover:bg-slate-100'}`} """
content = content.replace(old_back_btn.strip(), new_back_btn.strip())

# Replace the Avatar background
old_avatar = r"""className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-xl shadow-xs" """
new_avatar = r"""className={`w-[40px] h-[40px] rounded-full flex items-center justify-center text-[22px] shadow-sm ${isDarkMode ? 'bg-gradient-to-br from-[#182229] to-[#202C33]' : 'bg-gradient-to-br from-emerald-50 to-teal-100/50'}`} """
content = content.replace(old_avatar.strip(), new_avatar.strip())

# Add drop shadow to avatar text
content = content.replace(
    '                  {selectedTutor.avatar}',
    '                  <span className="drop-shadow-md">{selectedTutor.avatar}</span>'
)

# Replace name and text colors
old_name = r"""<h2 className="font-bold text-[15px] leading-tight truncate">"""
new_name = r"""<h2 className={`font-semibold text-[17px] leading-tight truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>"""
content = content.replace(old_name, new_name)

old_online = r"""<p className={`text-[11px] ${isDarkMode ? 'text-gray-300' : 'text-emerald-200'} flex items-center gap-1 font-medium`}>"""
new_online = r"""<p className={`text-[13px] ${isDarkMode ? 'text-[#8696A0]' : 'text-slate-500'} flex items-center gap-1.5 font-medium mt-0.5`}>"""
content = content.replace(old_online, new_online)

# Replace the Voti pill background
old_voti_pill = r"""className="bg-black/15 hover:bg-black/25 text-white text-xs px-2.5 py-1.5 rounded-full font-semibold flex items-center gap-1 transition-all active:scale-95" """
new_voti_pill = r"""className={`text-[13px] px-3 py-1.5 rounded-full font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${isDarkMode ? 'bg-[#202C33] text-[#8696A0] hover:bg-[#2A3942]' : 'bg-[#F0F2F5] text-slate-600 hover:bg-slate-200'}`} """
content = content.replace(old_voti_pill.strip(), new_voti_pill.strip())

# Replace the 3-dots menu button colors
old_dots = r"""className="p-1.5 rounded-full hover:bg-black/10 transition-colors text-white active:scale-95" """
new_dots = r"""className={`p-1.5 rounded-full transition-colors active:scale-95 ${isDarkMode ? 'text-gray-300 hover:bg-[#202C33]' : 'text-slate-500 hover:bg-slate-100'}`} """
content = content.replace(old_dots.strip(), new_dots.strip())

with open('src/components/Chat.tsx', 'w') as f:
    f.write(content)

print("Chat header successfully aligned with WA 2024!")
