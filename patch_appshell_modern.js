const fs = require('fs');
let content = fs.readFileSync('src/components/AppShell.tsx', 'utf-8');

// Modernize bottom bar container
const oldNav = /<nav className=\{\`flex justify-around items-center pb-safe-bottom z-50 transition-colors \[\&>\*\]:select-none \$\{\s*isDarkMode \? "bg-\[#111B21\] border-t border-\[#222E35\]" : "bg-white border-t border-slate-100 shadow-\[0_-4px_6px_-1px_rgba\(0,0,0,0.02\)\]"\s*\}\`\}>/;
const newNav = `<nav className={\`flex justify-around items-center pb-safe-bottom z-50 transition-colors [&>*]:select-none backdrop-blur-xl \${
        isDarkMode ? "bg-[#111B21]/90 border-t border-[#222E35]/50" : "bg-white/90 border-t border-slate-100 shadow-[0_-8px_20px_-1px_rgba(0,0,0,0.04)]"
      }\`}>`;

content = content.replace(oldNav, newNav);

// Give active tabs a nicer styling (pill bg)
// change px-4 py-1 to px-5 py-1.5 rounded-2xl
content = content.replace(/px-4 py-1 rounded-full/g, "px-5 py-1.5 rounded-2xl shadow-sm");
// increase icon size slightly from w-5 h-5 to w-6 h-6
content = content.replace(/className="w-5 h-5"/g, 'className="w-6 h-6"');

fs.writeFileSync('src/components/AppShell.tsx', content);
console.log("AppShell modernized!");
