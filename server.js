// simple Node static server for local testing (node server.js)
const http = require('http');
const fs = require('fs');
const path = require('path');
const port = process.env.PORT || 5000;
const mime = {
  '.html':'text/html', '.css':'text/css', '.js':'application/javascript', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml'
};
http.createServer((req,res)=>{
  let urlPath = req.url.split('?')[0];
  if(urlPath === '/') urlPath = '/index.html';
  const file = path.join(__dirname, urlPath);
  fs.readFile(file,(err,data)=>{
    if(err){ res.statusCode=404; res.end('Not found'); return }
    const ext = path.extname(file);
    res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
    res.end(data);
  })
}).listen(port, ()=> console.log('Server listening on http://localhost:'+port));