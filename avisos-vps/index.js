require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const cron = require('node-cron');
const fs = require('fs');
const crypto = require('crypto');

const GESTOR   = (process.env.GESTOR_URL || '').replace(/\/+$/, '');
const WA_KEY   = process.env.WA_KEY || '';
const NUMBER   = (process.env.WA_NUMBER || '').replace(/\D/g, '');     // chip del bot: 52 + 1 + 10 dígitos
const SEND_CRON= process.env.SEND_CRON || '0 10 * * *';               // 10:00 am hora de México
const MIN_DELAY= +(process.env.MIN_DELAY || 20);                       // segundos entre mensajes
const MAX_DELAY= +(process.env.MAX_DELAY || 45);
const SENT_FILE= './sent.json';

let sent = {};
try { sent = JSON.parse(fs.readFileSync(SENT_FILE)); } catch (e) {}
const saveSent = () => { try { fs.writeFileSync(SENT_FILE, JSON.stringify(sent)); } catch (e) {} };
const hashOf = (cid, keys) => crypto.createHash('sha1').update(cid + '|' + keys.join('~')).digest('hex');
const sleep  = ms => new Promise(r => setTimeout(r, ms));
const rnd    = (a, b) => Math.floor(a + Math.random() * (b - a));

let sock, ready = false, running = false;

async function runJob() {
  if (!ready) { console.log('[avisos] aún no conectado, se omite esta corrida'); return; }
  if (running) return;
  running = true;
  try {
    const r = await fetch(`${GESTOR}/api/wa-outbox?key=${encodeURIComponent(WA_KEY)}`);
    const d = await r.json().catch(() => ({}));
    if (!d.ok) { console.log('[avisos] gestor respondió:', d.error || r.status); return; }
    const items = d.items || [];
    console.log(`[avisos] ${items.length} cliente(s) por avisar`);
    let n = 0;
    for (const it of items) {
      const h = hashOf(it.cid, it.keys || []);
      if (sent[h]) continue;                 // ya se le avisó de estas mismas cuentas
      if (!it.phone || it.phone.length < 10) { console.log('[avisos] sin teléfono válido:', it.name); continue; }
      const jid = it.phone + '@s.whatsapp.net';
      try {
        await sock.sendMessage(jid, { text: it.text });
        sent[h] = Date.now(); saveSent(); n++;
        console.log(`[avisos] ✓ ${it.name} (${it.phone})`);
      } catch (e) {
        console.log(`[avisos] ✗ ${it.name}:`, e.message);
      }
      await sleep(rnd(MIN_DELAY, MAX_DELAY) * 1000);   // pausa anti-baneo
    }
    const cut = Date.now() - 60 * 864e5;               // olvida avisos de hace >60 días
    for (const k in sent) if (sent[k] < cut) delete sent[k];
    saveSent();
    console.log(`[avisos] listo: ${n} aviso(s) enviado(s)`);
  } catch (e) {
    console.log('[avisos] error:', e.message);
  } finally {
    running = false;
  }
}

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  let version;
  try { ({ version } = await fetchLatestBaileysVersion()); } catch (e) {}
  sock = makeWASocket({
    ...(version ? { version } : {}),
    logger: pino({ level: 'silent' }),
    auth: state,
    printQRInTerminal: false,
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 10000,
  });
  sock.ev.on('creds.update', saveCreds);

  if (!sock.authState.creds.registered && NUMBER) {
    setTimeout(async () => {
      try {
        let code = await sock.requestPairingCode(NUMBER);
        code = (code && code.match(/.{1,4}/g) ? code.match(/.{1,4}/g).join('-') : code);
        console.log('\n==============================');
        console.log('👉 CÓDIGO DE VINCULACIÓN:', code);
        console.log('WhatsApp → Dispositivos vinculados → Vincular con número de teléfono');
        console.log('==============================\n');
      } catch (e) { console.log('[avisos] error al pedir código:', e.message); }
    }, 3000);
  }

  sock.ev.on('connection.update', (u) => {
    const { connection, lastDisconnect } = u;
    if (connection === 'open') { ready = true; console.log('[avisos] ✅ conectado a WhatsApp'); }
    if (connection === 'close') {
      ready = false;
      const code = lastDisconnect && lastDisconnect.error && lastDisconnect.error.output && lastDisconnect.error.output.statusCode;
      if (code !== DisconnectReason.loggedOut) { console.log('[avisos] reconectando...'); setTimeout(start, 3000); }
      else console.log('[avisos] sesión cerrada: borra la carpeta "auth" y vuelve a vincular');
    }
  });
}

if (!GESTOR || !WA_KEY) { console.log('Falta configurar GESTOR_URL y WA_KEY en el archivo .env'); process.exit(1); }

start();
cron.schedule(SEND_CRON, runJob, { timezone: 'America/Mexico_City' });
console.log(`[avisos] iniciado. Enviará según "${SEND_CRON}" (hora de México).`);

// Para una prueba manual inmediata: node index.js --now
if (process.argv.includes('--now')) setTimeout(runJob, 8000);
