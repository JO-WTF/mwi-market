import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import fs from 'fs';

const app = new Hono().basePath('/api')

app.get('/', (c) => {
  return c.json({ message: "Congrats! You've deployed Hono to Vercel" })
})

app.post('/upload_market_book', async (c) => {
  const data = await c.req.json();
  fs.writeFileSync('milkyapi.json', JSON.stringify(data, null, 2));
  return c.json({ message: 'Data saved successfully' });
});

const handler = handle(app);

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const OPTIONS = handler;