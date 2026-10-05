const fs = require('fs');
let content = fs.readFileSync('src/components/TutorManager.tsx', 'utf-8');

// 1. Inject availableVoices state
const stateTarget = `const [formData, setFormData] = useState<Partial<Tutor>>({});`;
const stateReplacement = `const [formData, setFormData] = useState<Partial<Tutor>>({});
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const loadVoices = () => setAvailableVoices(window.speechSynthesis.getVoices());
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);`;
content = content.replace(stateTarget, stateReplacement);

// 2. Replace voiceLang text input with voiceURI select
const inputTargetRegex = /<div className="flex-1">\s*<label[^>]*>\s*Lingua Vocale\s*<\/label>\s*<input[^>]*voiceLang[^>]*\/>\s*<\/div>/;
const inputReplacement = `<div className="flex-1">
                  <label className={\`block text-xs font-bold uppercase tracking-wider mb-2 \${isDarkMode ? 'text-gray-400' : 'text-slate-500'}\`}>
                    Voce del Tutor
                  </label>
                  <select 
                    value={formData.voiceURI || ""} 
                    onChange={(e) => {
                      const v = availableVoices.find(x => x.voiceURI === e.target.value);
                      if (v) {
                        setFormData({...formData, voiceURI: v.voiceURI, voiceLang: v.lang});
                      } else {
                        setFormData({...formData, voiceURI: "", voiceLang: "it-IT"});
                      }
                    }}
                    className={\`w-full rounded-xl px-3.5 py-2.5 text-sm border outline-none font-semibold transition-colors \${
                      isDarkMode 
                        ? 'bg-[#111B21] border-[#2A3942] text-white focus:border-[#00A884]' 
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#008069]'
                    }\`}
                  >
                    <option value="">Voce predefinita di sistema</option>
                    {availableVoices.filter(v => v.lang.startsWith('it')).map(v => (
                      <option key={v.voiceURI} value={v.voiceURI}>{v.name} (Italiano)</option>
                    ))}
                    <optgroup label="Altre Lingue">
                      {availableVoices.filter(v => !v.lang.startsWith('it')).map(v => (
                        <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
                      ))}
                    </optgroup>
                  </select>
                  <p className={\`mt-1 text-[10px] leading-tight \${isDarkMode ? 'text-gray-500' : 'text-slate-400'}\`}>
                    Queste sono le voci gratuite presenti in questo momento sul tuo dispositivo.
                  </p>
                </div>`;
content = content.replace(inputTargetRegex, inputReplacement);

// 3. Make sure formData extraction preserves voiceURI
content = content.replace(
  'voiceLang: formData.voiceLang || "it-IT",',
  'voiceLang: formData.voiceLang || "it-IT",\n        voiceURI: formData.voiceURI,'
);

fs.writeFileSync('src/components/TutorManager.tsx', content);
console.log("TutorManager voice logic patched");
