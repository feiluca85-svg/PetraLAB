const fs = require('fs');
let content = fs.readFileSync('src/components/Chat.tsx', 'utf-8');

// Replace the old history hooks
const hookRegex = /\/\/ Gestione tasto indietro[\s\S]*?\}, \[selectedTutor\]\);/m;
const newHook = `  // Gestione tasto indietro infallibile tramite Hash
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash !== "#chat" && selectedTutor) {
        setSelectedTutor(null);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [selectedTutor]);`;

content = content.replace(hookRegex, newHook);

// Replace handleSelectTutor
const handlerRegex = /const handleSelectTutor = \(tutor: Tutor\) => \{[\s\S]*?\};/m;
const newHandler = `const handleSelectTutor = (tutor: Tutor) => {
    setSelectedTutor(tutor);
    window.location.hash = "chat";
  };`;

content = content.replace(handlerRegex, newHandler);

// The UI back button is already window.history.back(), which is correct since it will remove the hash.
// But just to be sure, let's make it explicitly remove the hash if we want, or history.back.
// history.back() is native and triggers hashchange.

fs.writeFileSync('src/components/Chat.tsx', content);
console.log("Hash router patched!");
