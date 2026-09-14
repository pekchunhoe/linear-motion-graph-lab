import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
const root=process.cwd();
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
export function startServer() {
const server=http.createServer(async(req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(!file.startsWith(root+sep)){res.writeHead(403).end();return;}
  try {res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(await readFile(file));}
  catch {res.writeHead(404).end('Not found');}
});
return new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(8000,'127.0.0.1',()=>resolve(server));
});
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await startServer();
