import re

with open('src/components/TutorManager.tsx', 'r') as f:
    c = f.read()

old_set_doc = """      await setDoc(doc(db, "petralab_tutors", formData.id), {
        ...formData,
        name: formData.name.trim(),
        subject: formData.subject.trim(),
        avatar: formData.avatar || "🦉",
        gender: formData.gender || "male",
        voiceLang: formData.voiceLang || "it-IT",
        voiceURI: formData.voiceURI,
        greeting: formData.greeting || "Ciao! Come posso aiutarti oggi?",
        prompt: formData.prompt || "Sei un tutor socratico amichevole per ragazzi delle scuole medie."
      });"""

new_set_doc = """      const dataToSave = {
        ...formData,
        name: formData.name.trim(),
        subject: formData.subject.trim(),
        avatar: formData.avatar || "🦉",
        gender: formData.gender || "male",
        voiceLang: formData.voiceLang || "it-IT",
        voiceURI: formData.voiceURI || null,
        greeting: formData.greeting || "Ciao! Come posso aiutarti oggi?",
        prompt: formData.prompt || "Sei un tutor socratico amichevole per ragazzi delle scuole medie."
      };
      
      // Prevent Firebase "undefined" errors
      Object.keys(dataToSave).forEach(key => {
        if ((dataToSave as any)[key] === undefined) {
          delete (dataToSave as any)[key];
        }
      });

      await setDoc(doc(db, "petralab_tutors", formData.id), dataToSave);"""

c = c.replace(old_set_doc, new_set_doc)

with open('src/components/TutorManager.tsx', 'w') as f:
    f.write(c)

print("TutorManager save logic fixed.")
