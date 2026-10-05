const fs = require('fs');
let content = fs.readFileSync('src/components/TutorManager.tsx', 'utf-8');
if (content.includes('import React, { useState } from "react";')) {
  content = content.replace('import React, { useState } from "react";', 'import React, { useState, useEffect } from "react";');
} else if (content.includes('import { useState } from "react";')) {
  content = content.replace('import { useState } from "react";', 'import { useState, useEffect } from "react";');
} else {
  // Just inject it at the top
  content = 'import { useEffect } from "react";\n' + content;
}
fs.writeFileSync('src/components/TutorManager.tsx', content);
