const fs = require('fs');
let content = fs.readFileSync('src/components/Chat.tsx', 'utf-8');

const target = `    utterance.lang = selectedTutor?.voiceLang || "it-IT";
    utterance.rate = voiceSpeed;`;

const replacement = `    utterance.lang = selectedTutor?.voiceLang || "it-IT";
    utterance.rate = voiceSpeed;
    
    if (selectedTutor?.voiceURI) {
      const voices = window.speechSynthesis.getVoices();
      const exactVoice = voices.find(v => v.voiceURI === selectedTutor.voiceURI);
      if (exactVoice) utterance.voice = exactVoice;
    }`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/Chat.tsx', content);
