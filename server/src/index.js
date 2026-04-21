import app from './app.js';

const port = Number(process.env.PORT) || 4000;
const host = process.env.HOST || '0.0.0.0';

app.listen(port, host, () => {
  console.log(`Vuln report server listening on http://${host}:${port}`);
});
