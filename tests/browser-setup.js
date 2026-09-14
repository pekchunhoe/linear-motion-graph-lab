import { startServer } from './server.js';
export default async function setup() {
  const server=await startServer();
  return async()=>{
    server.closeAllConnections();
    await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
  };
}
