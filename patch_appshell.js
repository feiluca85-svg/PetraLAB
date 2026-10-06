const fs = require('fs');
let content = fs.readFileSync('src/components/AppShell.tsx', 'utf-8');

const hookTarget = '  const { tutors, loading } = useTutors();';
const newHooks = `  const { tutors, loading } = useTutors();

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === "#parent") setActiveTab("parent");
      else if (hash === "#tutors") setActiveTab("tutors");
      else if (hash === "#profile") setActiveTab("profile");
      else setActiveTab("chat");
    };
    // Sync initial state
    handleHashChange();
    
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const changeTab = (tab: "chat" | "tutors" | "profile" | "parent") => {
    if (tab === "chat") {
      window.location.hash = "";
    } else {
      window.location.hash = tab;
    }
  };`;

content = content.replace(hookTarget, newHooks);

// Now replace setActiveTab in onClick handlers
content = content.replace(/onClick=\{\(\) => setActiveTab\("chat"\)\}/g, 'onClick={() => changeTab("chat")}');
content = content.replace(/onClick=\{\(\) => setActiveTab\("tutors"\)\}/g, 'onClick={() => changeTab("tutors")}');
content = content.replace(/onClick=\{\(\) => setActiveTab\("profile"\)\}/g, 'onClick={() => changeTab("profile")}');
content = content.replace(/onClick=\{\(\) => setActiveTab\("parent"\)\}/g, 'onClick={() => changeTab("parent")}');

fs.writeFileSync('src/components/AppShell.tsx', content);
console.log("AppShell patched!");
