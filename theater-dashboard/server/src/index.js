import { createApp } from './app.js';
import { getDb, initDb } from './db/schema.js';

const port = Number.parseInt(process.env.PORT || '3001', 10);
const db = initDb(getDb());
const app = createApp(db);

app.listen(port, () => {
  console.log(`Theater dashboard API listening on http://localhost:${port}`);
});
