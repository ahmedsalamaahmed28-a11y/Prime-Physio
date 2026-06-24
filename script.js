const fs = require('fs');
const files = fs.readdirSync('recovery').filter(f => f.endsWith('.tsx'));
files.forEach(f => {
  const c = fs.readFileSync('recovery/' + f, 'utf8');
  if (c.includes('isRtl ?')) {
    console.log(f, 'has isRtl');
    const matches = c.match(/isRtl \? \"(.*?)\"/g);
    if (matches && matches[0].includes('O ')) {
      console.log(f, 'is CORRUPTED');
    } else {
      console.log(f, 'is OK');
    }
  }
})
