const fs = require('fs');
let content = fs.readFileSync('src/components/TutorManager.tsx', 'utf-8');

// 1. Inject availableVoices state
if (!content.includes('availableVoices')) {
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
}

// 2. Replace voiceLang text input with voiceURI select
const inputTargetRegex = /<div>\s*<label[^>]*>\s*Lingua Voce \(TTS\)\s*<\/label>\s*<input[\s\S]*?onChange={\(e\) => setFormData\({...formData, voiceLang: e\.target\.value}\)}[\s\S]*?\/>\s*<\/div>/;
const inputReplacement = `<div>
                  <label className={\`block text-xs font-bold uppercase tracking-wider mb-1.5 \${isDarkMode ? 'text-[#8696A0]' : 'text-slate-500'}\`}>
                    Voce del Tutor (TTS)
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
                    className={\`w-full rounded-xl px-3 py-2 text-[13px] border outline-none font-medium transition-colors \${
                      isDarkMode 
                        ? 'bg-[#202C33] border-[#2A3942] text-white focus:border-[#00A884]' 
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
                    Queste voci dipendono dal dispositivo in uso.
                  </p>
                </div>`;
content = content.replace(inputTargetRegex, inputReplacement);

// 3. Make sure formData extraction preserves voiceURI
content = content.replace(
  'voiceLang: formData.voiceLang || "it-IT",',
  'voiceLang: formData.voiceLang || "it-IT",\n        voiceURI: formData.voiceURI,'
);

fs.writeFileSync('src/components/TutorManager.tsx', content);
console.log("TutorManager voice logic properly patched");
