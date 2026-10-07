const fs = require('fs');
let content = fs.readFileSync('src/components/Chat.tsx', 'utf-8');

const badgeEffect = `  // Effetto Badge OS
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
      const urgentCount = agendaItems.filter(item => {
        if (item.isCompleted) return false;
        const d = item.dueDate || '';
        const todayStr = new Date().toISOString().split('T')[0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tStr = tomorrow.toISOString().split('T')[0];
        return d === todayStr || d === tStr;
      }).length;
      
      if (urgentCount > 0) {
        (navigator as any).setAppBadge(urgentCount).catch(console.error);
      } else {
        (navigator as any).clearAppBadge().catch(console.error);
      }
    }
  }, [agendaItems]);`;

content = content.replace('const [showHomeMenu, setShowHomeMenu] = useState(false);', `const [showHomeMenu, setShowHomeMenu] = useState(false);\n${badgeEffect}`);

fs.writeFileSync('src/components/Chat.tsx', content);
console.log("App Badge logic injected!");
