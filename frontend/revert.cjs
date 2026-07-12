const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // We only want to replace standalone `primary`, `secondary`, `neutral` that are part of Tailwind classes.
    content = content.replace(/bg-primary(?![-a-zA-Z0-9])/g, 'bg-primary-600');
    content = content.replace(/text-primary(?![-a-zA-Z0-9])/g, 'text-primary-600');
    content = content.replace(/border-primary(?![-a-zA-Z0-9])/g, 'border-primary-600');
    content = content.replace(/ring-primary(?![-a-zA-Z0-9])/g, 'ring-primary-600');
    content = content.replace(/from-primary(?![-a-zA-Z0-9])/g, 'from-primary-600');
    content = content.replace(/to-primary(?![-a-zA-Z0-9])/g, 'to-primary-600');
    
    content = content.replace(/bg-secondary(?![-a-zA-Z0-9])/g, 'bg-surface-900');
    content = content.replace(/text-secondary(?![-a-zA-Z0-9])/g, 'text-slate-200');
    content = content.replace(/border-secondary(?![-a-zA-Z0-9])/g, 'border-white/10');
    content = content.replace(/from-secondary(?![-a-zA-Z0-9])/g, 'from-surface-950');
    content = content.replace(/via-secondary(?![-a-zA-Z0-9])/g, 'via-surface-900');
    content = content.replace(/to-secondary(?![-a-zA-Z0-9])/g, 'to-surface-800');

    content = content.replace(/bg-neutral(?![-a-zA-Z0-9])/g, 'bg-slate-50');
    content = content.replace(/text-neutral(?![-a-zA-Z0-9])/g, 'text-slate-500');
    content = content.replace(/border-neutral(?![-a-zA-Z0-9])/g, 'border-slate-200');
    content = content.replace(/from-neutral(?![-a-zA-Z0-9])/g, 'from-slate-100');
    content = content.replace(/to-neutral(?![-a-zA-Z0-9])/g, 'to-slate-900');

    if (content !== original) {
      fs.writeFileSync(filePath, content);
      console.log(`Reverted ${filePath}`);
    }
  }
});
