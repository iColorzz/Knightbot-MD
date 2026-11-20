require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const cron = require('node-cron');
const fs = require('fs');
const crypto = require('crypto');

const GESTOR    = (process.env.GESTOR_URL || '').replace(/\/+$/, '');
const WA_KEY    = process.env.WA_KEY || '';
const NUMBER    = (process.env.WA_NUMBER || '').replace(/\D/g, '');   // chip que envía los avisos
const MIN_DELAY = +(process.env.MIN_DELAY || 20);                     // segundos entre mensajes
const MAX_DELAY = +(process.env.MAX_DELAY || 45);
const FORWARD   = (process.env.FORWARD || 'on') !== 'off';            // reenviar respuestas de clientes al dueño
const SENT_FILE = './sent.json', STATE_FILE = './state.json';
const norm10 = n => { n = String(n || '').replace(/\D/g, ''); return n.length === 10 ? '52' + n : n; };
const OWNER     = norm10(process.env.OWNER);                           // tu número principal
const CMD_PIN   = String(process.env.CMD_PIN || '').trim();            // clave para .soy (si WhatsApp oculta tu número)

const readJ = (f, d) => { try { return JSON.parse(fs.readFileSync(f)); } catch (e) { return d; } };
const writeJ = (f, v) => { try { fs.writeFileSync(f, JSON.stringify(v)); } catch (e) {} };
let sent = readJ(SENT_FILE, {});
let state = Object.assign({ paused: false, time: '', admins: [] }, readJ(STATE_FILE, {}));
const saveSent = () => writeJ(SENT_FILE, sent), saveState = () => writeJ(STATE_FILE, state);

// Hora del envío: la de .hora (state) o la del .env (SEND_CRON) o 10:00
const cronFromTime = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(t || ''); return m ? `${+m[2]} ${+m[1]} * * *` : null; };
const currentCron = () => cronFromTime(state.time) || process.env.SEND_CRON || '0 10 * * *';
const cronLabel = c => { const p = c.split(' '); return /^\d+$/.test(p[0]) && /^\d+$/.test(p[1]) ? `${p[1].padStart(2, '0')}:${p[0].padStart(2, '0')}` : c; };

const fold = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const hashOf = (cid, keys) => crypto.createHash('sha1').update(cid + '|' + keys.join('~')).digest('hex');
const sleep  = ms => new Promise(r => setTimeout(r, ms));
const rnd    = (a, b) => Math.floor(a + Math.random() * (b - a));

let sock, ready = false, running = false, task = null, ownerJid = null;

// En México hay cuentas registradas como 52+10 dígitos y otras como 521+10: se pregunta a WhatsApp cuál existe
async function resolveJid(phone) {
  phone = norm10(phone);
  const cands = [phone];
  if (/^52\d{10}$/.test(phone)) cands.push('521' + phone.slice(2));
  if (/^521\d{10}$/.test(phone)) cands.push('52' + phone.slice(3));
  for (const c of cands) {
    try { const r = await sock.onWhatsApp(c + '@s.whatsapp.net'); if (r && r[0] && r[0].exists) return r[0].jid; } catch (e) {}
  }
  return null;
}
const say = (jid, text) => sock.sendMessage(jid, { text }).catch(e => console.log('[avisos] no se pudo responder:', e.message));

async function getOutbox() {
  const r = await fetch(`${GESTOR}/api/wa-outbox?key=${encodeURIComponent(WA_KEY)}`);
  const d = await r.json().catch(() => ({}));
  if (!d.ok) throw new Error(d.error || ('HTTP ' + r.status));
  return d.items || [];
}

// Manda los avisos pendientes. Devuelve un resumen.
async function runJob(manual, filtro) {
  if (!ready) return { error: 'aún no conectado' };
  if (!manual && state.paused) { console.log('[avisos] en pausa, no se envía'); return { paused: true }; }
  if (running) return { error: 'ya hay un envío en curso' };
  running = true;
  const res = { n: 0, ya: 0, sinWa: [], fallos: [], total: 0 };
  try {
    let items = await getOutbox();
    if (filtro) items = items.filter(it => fold(it.name).includes(fold(filtro)));
    res.total = items.length;
    if (filtro && !items.length) res.error = `nadie con cuentas por vencer se llama "${filtro}"`;
    console.log(`[avisos] ${items.length} cliente(s) en la lista`);
    for (const it of items) {
      const h = hashOf(it.cid, it.keys || []);
      if (sent[h]) { res.ya++; continue; }
      const jid = await resolveJid(it.phone);
      if (!jid) { res.sinWa.push(it.name); console.log(`[avisos] ${it.name} (${it.phone}) no tiene WhatsApp`); continue; }
      try {
        await sock.sendMessage(jid, { text: it.text });
        sent[h] = Date.now(); saveSent(); res.n++;
        console.log(`[avisos] ✓ ${it.name} (${it.phone})`);
      } catch (e) { res.fallos.push(it.name); console.log(`[avisos] ✗ ${it.name}:`, e.message); }
      await sleep(rnd(MIN_DELAY, MAX_DELAY) * 1000);   // pausa anti-baneo
    }
    const cut = Date.now() - 60 * 864e5;               // olvida avisos de hace >60 días
    for (const k in sent) if (sent[k] < cut) delete sent[k];
    saveSent();
    console.log(`[avisos] listo: ${res.n} enviado(s)`);
  } catch (e) { res.error = e.message; console.log('[avisos] error:', e.message); }
  finally { running = false; }
  return res;
}

const resumen = r => r.error ? `⚠️ No se pudo: ${r.error}`
  : r.paused ? '⏸️ Está en pausa.'
  : `✅ Envío terminado\n• Enviados: ${r.n}\n• Ya avisados antes: ${r.ya}${r.sinWa.length ? `\n• Sin WhatsApp: ${r.sinWa.join(', ')}` : ''}${r.fallos.length ? `\n• Fallaron: ${r.fallos.join(', ')}` : ''}`;

function schedule() {
  if (task) task.stop();
  task = cron.schedule(currentCron(), async () => {
    const r = await runJob(false);
    if (ownerJid && !r.paused && (r.n || r.error || (r.fallos && r.fallos.length))) say(ownerJid, '📬 Avisos automáticos de hoy\n' + resumen(r).replace(/^✅ Envío terminado\n/, ''));
  }, { timezone: 'America/Mexico_City' });
}

// ---------- Comandos (solo el dueño) ----------
const digitsOf = j => String(j || '').split('@')[0].split(':')[0];
function isOwner(m) {
  const k = m.key || {};
  const js = [k.remoteJid, k.remoteJidAlt, k.senderPn, k.participant, k.participantAlt].filter(Boolean);
  if (js.some(j => state.admins.includes(j))) return true;
  if (!OWNER) return false;
  const own = new Set([OWNER, '521' + OWNER.slice(2), '52' + OWNER.slice(3)]);
  return js.some(j => /@s\.whatsapp\.net$/.test(j) && own.has(digitsOf(j)));
}

const AYUDA = `🤖 *Comandos de CLRzDesk Avisos*

.lista — a quién le toca aviso (no manda nada)
.enviar — manda ahorita los avisos pendientes
.enviar nombre — manda solo al cliente con ese nombre
.estado — conexión, hora y pausa
.pausa — apaga el envío automático
.reanudar — vuelve a prenderlo
.hora 10:30 — cambia la hora del envío diario
.ayuda — esta lista`;

async function onCommand(from, text) {
  const [cmd, ...rest] = text.trim().split(/\s+/);
  const arg = rest.join(' ');
  switch (cmd.toLowerCase()) {
    case '.ayuda': case '.menu': case '.help':
      return say(from, AYUDA);
    case '.estado':
      return say(from, `📊 *Estado*\n• WhatsApp: ${ready ? 'conectado ✅' : 'desconectado ❌'}\n• Envío automático: ${state.paused ? 'en pausa ⏸️' : 'activo ▶️'}\n• Hora diaria: ${cronLabel(currentCron())} (hora de México)\n• Avisos recordados: ${Object.keys(sent).length}\n• Reenvío de respuestas: ${FORWARD ? 'sí' : 'no'}`);
    case '.pausa':
      state.paused = true; saveState();
      return say(from, '⏸️ Envío automático en pausa. Usa .reanudar para prenderlo.');
    case '.reanudar':
      state.paused = false; saveState();
      return say(from, `▶️ Envío automático activo. Próximo envío a las ${cronLabel(currentCron())}.`);
    case '.hora': {
      const t = /^(\d{1,2})(?::(\d{2}))?$/.exec(arg);
      if (!t || +t[1] > 23 || +(t[2] || 0) > 59) return say(from, 'Escríbela así: .hora 10:30 (formato 24 h)');
      state.time = `${+t[1]}:${String(+(t[2] || 0)).padStart(2, '0')}`; saveState(); schedule();
      return say(from, `🕒 Listo, los avisos saldrán todos los días a las ${cronLabel(currentCron())}.`);
    }
    case '.lista': {
      try {
        const items = await getOutbox();
        if (!items.length) return say(from, '✅ Nadie tiene cuentas por vencer ahorita.');
        const L = items.map(it => `${sent[hashOf(it.cid, it.keys || [])] ? '✅' : '⏳'} ${it.name} — ${(it.keys || []).length} cuenta(s)`);
        const pend = L.filter(x => x.startsWith('⏳')).length;
        return say(from, `📋 *Por vencer* (${items.length})\n\n${L.join('\n')}\n\n⏳ pendiente (${pend}) · ✅ ya avisado\nUsa .enviar para mandar los pendientes.`);
      } catch (e) { return say(from, '⚠️ No pude consultar el gestor: ' + e.message); }
    }
    case '.enviar': {
      if (running) return say(from, '⏳ Ya hay un envío en curso.');
      await say(from, arg ? `📤 Enviando aviso a "${arg}"…` : '📤 Enviando avisos pendientes… (con pausas entre cada uno)');
      return say(from, resumen(await runJob(true, arg)));
    }
    default:
      return say(from, 'No conozco ese comando. Escribe .ayuda');
  }
}

async function onMessage(m) {
  if (!m.message || m.key.fromMe) return;
  const from = m.key.remoteJid || '';
  if (from.endsWith('@g.us') || from === 'status@broadcast' || from.endsWith('@newsletter')) return;
  const msg = m.message;
  const text = (msg.conversation || (msg.extendedTextMessage && msg.extendedTextMessage.text) || (msg.imageMessage && msg.imageMessage.caption) || '').trim();

  if (text.startsWith('.soy ')) {
    if (CMD_PIN && text.slice(5).trim() === CMD_PIN) {
      if (!state.admins.includes(from)) state.admins.push(from);
      saveState(); ownerJid = from;
      return say(from, '✅ Listo, ya te reconozco como dueño. Escribe .ayuda');
    }
    return;
  }
  if (isOwner(m)) {
    ownerJid = from;
    if (text.startsWith('.')) return onCommand(from, text);
    return;
  }
  // Respuesta de un cliente → reenviar al dueño
  if (FORWARD && ownerJid) {
    const who = m.pushName || 'Cliente';
    const num = digitsOf(m.key.remoteJidAlt || m.key.senderPn || (from.endsWith('@s.whatsapp.net') ? from : ''));
    const body = text || '[mandó un archivo, audio o sticker]';
    say(ownerJid, `💬 *${who}*${num ? ` (+${num})` : ''} respondió:\n\n${body}`);
  }
}

// ---------- Conexión ----------
async function start() {
  const { state: auth, saveCreds } = await useMultiFileAuthState('auth');
  let version;
  try { ({ version } = await fetchLatestBaileysVersion()); } catch (e) {}
  sock = makeWASocket({
    ...(version ? { version } : {}),
    logger: pino({ level: 'silent' }),
    auth,
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

  sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type !== 'notify' || TEST) return;
    for (const m of messages) onMessage(m).catch(e => console.log('[avisos] error mensaje:', e.message));
  });

  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect } = u;
    if (connection === 'open') {
      ready = true; console.log('[avisos] ✅ conectado a WhatsApp');
      if (TEST) return sendTest().catch(e => { console.log('[prueba] error:', e.message); process.exit(1); });
      if (!ownerJid && OWNER) ownerJid = await resolveJid(OWNER);
    }
    if (connection === 'close') {
      ready = false;
      const code = lastDisconnect && lastDisconnect.error && lastDisconnect.error.output && lastDisconnect.error.output.statusCode;
      if (code !== DisconnectReason.loggedOut) { console.log('[avisos] reconectando...'); setTimeout(start, 3000); }
      else console.log('[avisos] sesión cerrada: borra la carpeta "auth" y vuelve a vincular');
    }
  });
}

// Modo prueba: node index.js --test 5512345678 → manda un mensaje a ese número y se cierra
const TI = process.argv.indexOf('--test');
const TEST = TI > -1 ? norm10(process.argv[TI + 1]) : '';
async function sendTest() {
  const jid = await resolveJid(TEST);
  if (!jid) { console.log('[prueba] ese número no tiene WhatsApp:', TEST); process.exit(1); }
  await sock.sendMessage(jid, { text: '✅ Prueba de CLRzDesk Avisos: el VPS ya puede mandar recordatorios por WhatsApp.' });
  console.log('[prueba] ✓ mensaje enviado a', jid);
  setTimeout(() => process.exit(0), 3000);
}

if (!GESTOR || !WA_KEY) { console.log('Falta configurar GESTOR_URL y WA_KEY en el archivo .env'); process.exit(1); }

start();
if (!TEST) {
  schedule();
  console.log(`[avisos] iniciado. Envío diario a las ${cronLabel(currentCron())} (hora de México)${state.paused ? ' — EN PAUSA' : ''}.`);
} else console.log('[prueba] conectando para mandar un mensaje de prueba a', TEST);
