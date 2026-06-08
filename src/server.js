import http from 'http';
import { app } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { ensureSeedAdmin } from './store.js';
import { initSocket } from './socket.js';

connectDatabase()
  .then(async () => {
    await ensureSeedAdmin();
    const server = http.createServer(app);
    initSocket(server);
    server.listen(env.port, () => {
      console.log(`GoUnion Express API listening on http://127.0.0.1:${env.port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB:', error.message);
    process.exit(1);
  });
