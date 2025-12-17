const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'leanfeast.ppn');
const outputPath = path.join(__dirname, 'leanfeast_base64.txt');

const buf = fs.readFileSync(inputPath);
const base64 = buf.toString('base64');

fs.writeFileSync(outputPath, base64);
console.log('Wrote base64 to', outputPath);