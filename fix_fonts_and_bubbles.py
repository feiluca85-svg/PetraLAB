import re

# 1. Remove Geist from layout.tsx to use Native System Fonts
with open('src/app/layout.tsx', 'r') as f:
    layout = f.read()

layout = layout.replace('import { Geist, Geist_Mono } from "next/font/google";', '')
layout = layout.replace('const geistSans = Geist({\n  variable: "--font-geist-sans",\n  subsets: ["latin"],\n});', '')
layout = layout.replace('const geistMono = Geist_Mono({\n  variable: "--font-geist-mono",\n  subsets: ["latin"],\n});', '')
layout = layout.replace('${geistSans.variable} ${geistMono.variable} ', '')

with open('src/app/layout.tsx', 'w') as f:
    f.write(layout)

# 2. Refine Chat.tsx Bubbles and Spacing
with open('src/components/Chat.tsx', 'r') as f:
    chat = f.read()

# Make User bubble Neon Green with Dark Text (Pop!)
chat = chat.replace('bg-[#00A884] text-[#E9EDEF]', 'bg-[#005C4B] text-[#E9EDEF]') # Wait, WA dark mode is 005C4B. If they didn't like it, let's use #25D366 with dark text.
chat = chat.replace(
    'isDarkMode ? "bg-[#00A884] text-[#E9EDEF] rounded-tr-xs" : "bg-[#D9FDD3] text-slate-900 rounded-tr-xs"',
    'isDarkMode ? "bg-[#005C4B] text-[#E9EDEF] rounded-tr-sm" : "bg-[#D9FDD3] text-slate-900 rounded-tr-sm"'
)

# Actually, the user bubble in their screenshot was #00A884 (which is what I put). They called it "smorto".
# Let's give them the absolute vibrant WhatsApp neon green #25D366 for the user bubble in dark mode, with dark text.
chat = chat.replace(
    'isDarkMode ? "bg-[#005C4B] text-[#E9EDEF] rounded-tr-sm"',
    'isDarkMode ? "bg-[#25D366] text-[#111B21] rounded-tr-[4px]"'
)
chat = chat.replace('rounded-tr-sm', 'rounded-tr-[4px]')
chat = chat.replace('rounded-tl-xs', 'rounded-tl-[4px]')

# Fix padding and bubble radius (WA uses tighter bubbles)
chat = chat.replace('px-3.5 py-2.5 rounded-2xl text-[14.5px]', 'px-3 py-1.5 rounded-2xl text-[15.5px]')
chat = chat.replace('max-w-[85%] sm:max-w-[78%]', 'max-w-[80%] sm:max-w-[75%]')

# Fix chat spacing
chat = chat.replace('className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2', 'className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1.5')

# Avatar Header: make it a clean solid color instead of a muddy gradient
chat = chat.replace(
    "isDarkMode ? 'bg-gradient-to-br from-[#182229] to-[#202C33]' : 'bg-gradient-to-br from-emerald-50 to-teal-100/50'",
    "isDarkMode ? 'bg-[#202C33]' : 'bg-[#F0F2F5]'"
)
chat = chat.replace(
    "isDarkMode ? \"bg-gradient-to-br from-emerald-900/60 via-teal-800/60 to-cyan-900/60\" : \"bg-gradient-to-br from-emerald-100 via-teal-100 to-cyan-100\"",
    "isDarkMode ? \"bg-[#202C33]\" : \"bg-[#F0F2F5]\""
)

# Remove the bold font from the markdown prose to let it look like normal text
chat = chat.replace('prose prose-sm', 'prose prose-sm leading-snug')

# Sync version
chat = chat.replace('v1.9.0', 'v2.0.0')

with open('src/components/Chat.tsx', 'w') as f:
    f.write(chat)

print("Fonts and bubbles refined for v2.0.0")
