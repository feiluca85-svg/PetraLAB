const fs = require('fs');
let content = fs.readFileSync('src/components/ParentDashboard.tsx', 'utf-8');

const stateTarget = /const \[activeSubTab, setActiveSubTab\] = useState<[^>]+>\("agenda"\);/;
const stateReplacement = `const [activeSubTab, setActiveSubTab] = useState<"security" | "grades" | "chats" | "tutors" | "agenda">("agenda");
  
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualType, setManualType] = useState<"task" | "grade">("task");
  const [manualFormData, setManualFormData] = useState({
    subject: "",
    type: "Compito",
    description: "",
    dueDate: "",
    grade: "",
    topic: ""
  });`;

content = content.replace(stateTarget, stateReplacement);

fs.writeFileSync('src/components/ParentDashboard.tsx', content);
console.log("States fixed!");
