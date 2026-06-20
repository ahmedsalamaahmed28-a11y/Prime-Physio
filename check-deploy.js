const https = require('https');
function get(url) {
  return new Promise(function(resolve, reject) {
    https.get(url, function(res) {
      let data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() { resolve(data); });
    }).on('error', reject);
  });
}
Promise.all([
  get('https://primephysio.vercel.app/login'),
  get('https://prime-physio-7oophbo9b-ahmedsalamaahmed21-sources-projects.vercel.app/login')
]).then(function(htmls) {
  var newHtml = htmls[0], oldHtml = htmls[1];
  var checks = ['STARTER','PROFESSIONAL','GOLD','500 patients','باقة','الأساسية','الفضية','الذهبية'];
  console.log('=== Current (primephysio.vercel.app) ===');
  checks.forEach(function(c) { console.log('  Has "'+c+'":', newHtml.includes(c)); });
  console.log('=== Reference (old deployment) ===');
  checks.forEach(function(c) { console.log('  Has "'+c+'":', oldHtml.includes(c)); });
  console.log('\n=== Length ===');
  console.log('Current:', newHtml.length);
  console.log('Reference:', oldHtml.length);
});
