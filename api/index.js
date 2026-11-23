// Vercel serverless entry: every /api/* request is rewritten to this function (see vercel.json).
// Storage is MongoDB; set MONGODB_URI in the Vercel project settings (see DEPLOY.md).
const { createHandler } = require('../lib/core');
const { createMongoStore } = require('../lib/store-mongo');

let handler = null;

async function sendResetEmail(to, subject, text) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.RESEND_FROM || 'Family Tree Builder <onboarding@resend.dev>', to: [to], subject, text })
  });
  if (!res.ok) throw new Error(`Resend answered ${res.status}`);
}

function build() {
  const store = createMongoStore({ uri: process.env.MONGODB_URI, dbName: process.env.MONGODB_DB || 'familytree' });
  return createHandler({
    store,
    options: {
      allowNullOrigin: false,
      trustProxy: true,
      allowSignup: String(process.env.ALLOW_SIGNUP || 'true').toLowerCase() !== 'false',
      email: process.env.RESEND_API_KEY ? { send: sendResetEmail } : undefined,
      maxBody: 4.5 * 1024 * 1024, // Vercel's request size limit
      log: (msg) => console.log(msg)
    }
  });
}

module.exports = async (req, res) => {
  if (!process.env.MONGODB_URI) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ error: 'The server is not set up yet: add MONGODB_URI in the Vercel project settings.' }));
  }
  // all /api/* requests are rewritten to this function (see vercel.json) and keep their original URL
  if (!handler) handler = build();
  return handler(req, res);
};
