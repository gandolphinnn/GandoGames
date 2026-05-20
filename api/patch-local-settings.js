const fs = require('fs');
const settings = JSON.parse(fs.readFileSync('local.settings.json', 'utf8'));
settings.Host = { CORS: 'http://localhost:1212', CORSCredentials: false };
fs.writeFileSync('local.settings.json', JSON.stringify(settings, null, '\t'));
