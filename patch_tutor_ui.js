const fs = require('fs');
let content = fs.readFileSync('src/components/TutorManager.tsx', 'utf-8');

// 1. Remove availableVoices
content = content.replace(/const \[availableVoices, setAvailableVoices\].*?\}, \[\]\);/s, '');

// 2. Replace EMOJI_PRESETS with a categorized list of objects
const emojiRegex = /const EMOJI_PRESETS = \[[^\]]*\];/s;
const newEmojis = `const EMOJI_CATEGORIES = [
  {
    label: "Persone e Professioni",
    emojis: ["👨‍🏫", "👩‍🏫", "👨‍🔬", "👩‍🔬", "👨‍🚀", "👩‍🚀", "👨‍🎨", "👩‍🎨", "🕵️‍♂️", "🕵️‍♀️", "🥷", "🦸‍♂️", "🦸‍♀️", "🧙‍♂️", "🧙‍♀️", "🧚‍♂️", "🧚‍♀️", "🧛‍♂️", "🧛‍♀️", "🧜‍♂️", "🧜‍♀️", "🤴", "👸"]
  },
  {
    label: "Animali",
    emojis: ["🦊", "🦁", "🐯", "🐶", "🐱", "🐭", "🐹", "🐰", "🐻", "🐼", "🐨", "🐸", "🐵", "🐔", "🐧", "🐦", "🐤", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞", "🐜", "🦟", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🐊", "🐅", "🐆", "🦓", "🦍", "🦧", "🐘", "🦛", "🦏", "🐪", "🐫", "🦒", "🦘", "🐃", "🐂", "🐄", "🐎", "🐖", "🐏", "🐑", "🦙", "🐐", "🦌", "🐕", "🐩", "🦮", "🐕‍🦺", "🐈", "🐈‍⬛", "🐓", "🦃", "🦚", "🦜", "🦢", "🦩", "🕊️", "🐇", "🦝", "🦨", "🦡", "🦦", "🦥", "🐁", "🐀", "🐿️", "🦔"]
  },
  {
    label: "Mostri e Alieni",
    emojis: ["👾", "👽", "👻", "👹", "👺", "🤡", "💩", "💀", "☠️", "🎃", "🤖"]
  },
  {
    label: "Oggetti Magici e Studio",
    emojis: ["📚", "📖", "📜", "🖍️", "🖊️", "🖋️", "✒️", "✏️", "📝", "💼", "📁", "📂", "📅", "📆", "📇", "📈", "📉", "📊", "📋", "📌", "📍", "📎", "📏", "📐", "✂️", "🔒", "🔓", "🔏", "🔐", "🔑", "🗝️", "🔨", "🪓", "🛠️", "🗡️", "⚔️", "🔫", "🏹", "🛡️", "🔧", "🔩", "⚙️", "🗜️", "⚖️", "🦯", "🔗", "⛓️", "🧲", "⚗️", "🧪", "🧫", "🧬", "🔬", "🔭", "📡", "💉", "🩸", "💊", "🩹", "🩺", "🚪", "🛏️", "🛋️", "🪑", "🚽", "🚿", "🛁", "🪒", "🧴", "🧷", "🧹", "🧺", "🧻", "🧼", "🧽", "🧯", "🛒"]
  },
  {
    label: "Natura e Spazio",
    emojis: ["🌍", "🌎", "🌏", "🌕", "🌖", "🌗", "🌘", "🌑", "🌒", "🌓", "🌔", "🌙", "🌚", "🌛", "🌜", "☀️", "🌝", "🌞", "⭐", "🌟", "🌠", "🌌", "☁️", "⛅", "⛈️", "🌤️", "🌥️", "🌦️", "🌧️", "🌨️", "🌩️", "🌪️", "🌫️", "🌬️", "🌀", "🌈", "🌂", "☂️", "☔", "⛱️", "⚡", "❄️", "☃️", "⛄", "☄️", "🔥", "💧", "🌊"]
  }
];`;
content = content.replace(emojiRegex, newEmojis);

// 3. Replace the Voice dropdown
const voiceTarget = /<div>\s*<label[^>]*>\s*Voce del Tutor \(TTS\)\s*<\/label>[\s\S]*?<\/div>/;
const voiceReplacement = `<div>
                  <label className={\`block text-xs font-bold uppercase tracking-wider mb-1.5 \${isDarkMode ? 'text-[#8696A0]' : 'text-slate-500'}\`}>
                    Lingua del Tutor (TTS)
                  </label>
                  <select 
                    value={formData.voiceLang || "it-IT"} 
                    onChange={(e) => setFormData({...formData, voiceLang: e.target.value, voiceURI: undefined})}
                    className={\`w-full rounded-xl px-3 py-2 text-[13px] border outline-none font-medium transition-colors \${
                      isDarkMode 
                        ? 'bg-[#202C33] border-[#2A3942] text-white focus:border-[#00A884]' 
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#008069]'
                    }\`}
                  >
                    <option value="it-IT">🇮🇹 Italiano</option>
                    <option value="en-US">🇬🇧 Inglese (Americano)</option>
                    <option value="en-GB">🇬🇧 Inglese (Britannico)</option>
                    <option value="fr-FR">🇫🇷 Francese</option>
                    <option value="es-ES">🇪🇸 Spagnolo</option>
                    <option value="de-DE">🇩🇪 Tedesco</option>
                  </select>
                  <p className={\`mt-1 text-[10px] leading-tight \${isDarkMode ? 'text-gray-500' : 'text-slate-400'}\`}>
                    Scegli la lingua per la pronuncia corretta.
                  </p>
                </div>`;
content = content.replace(voiceTarget, voiceReplacement);

// 4. Replace the Emoji buttons with a select dropdown
const emojiUITarget = /<div className="flex flex-wrap gap-2 mb-2">[\s\S]*?<\/div>\s*<input\s*type="text"\s*placeholder="Oppure inserisci qualsiasi emoji personalizzata..."[\s\S]*?\/>/;
const emojiUIReplacement = `<select 
                  value={formData.avatar || "🦉"}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                  className={\`w-full rounded-xl px-3 py-2 text-2xl border outline-none transition-colors \${
                    isDarkMode 
                      ? 'bg-[#111B21] border-[#2A3942] text-white focus:border-[#00A884]' 
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#008069]'
                  }\`}
                >
                  <option value={formData.avatar || "🦉"}>{formData.avatar || "🦉"} (Attuale)</option>
                  {EMOJI_CATEGORIES.map(cat => (
                    <optgroup key={cat.label} label={cat.label}>
                      {cat.emojis.map(emoji => (
                        <option key={emoji} value={emoji}>{emoji}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>`;
content = content.replace(emojiUITarget, emojiUIReplacement);

fs.writeFileSync('src/components/TutorManager.tsx', content);
console.log("TutorManager UI properly patched");
