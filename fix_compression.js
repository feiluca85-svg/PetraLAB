const fs = require('fs');
let content = fs.readFileSync('src/components/ParentDashboard.tsx', 'utf-8');

const badFunc = `const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };`;

const goodFunc = `const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const max = 1024;
          if (width > max || height > max) {
            if (width > height) { height = Math.round((height * max) / width); width = max; }
            else { width = Math.round((width * max) / height); height = max; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#FFF";
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.7));
          } else {
            resolve(reader.result as string);
          }
        };
        img.onerror = error => reject(error);
      };
      reader.onerror = error => reject(error);
    });
  };`;

content = content.replace(badFunc, goodFunc);

fs.writeFileSync('src/components/ParentDashboard.tsx', content);
console.log("Done compression fix");
