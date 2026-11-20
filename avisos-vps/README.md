# CLRzDesk · Avisos por WhatsApp (VPS)

Manda solo, por WhatsApp, los recordatorios de vencimiento de tus clientes.
El gestor (Cloudflare) calcula a quién avisar; este programa en el VPS los envía.

## Cómo funciona
1. Cada día a la hora que configures, consulta `gestor.clrcolorz.shop/api/wa-outbox`.
2. El gestor devuelve los clientes con cuentas por vencer (solo las tuyas) y el mensaje ya escrito.
3. Envía cada recordatorio con una pausa entre uno y otro (anti-baneo) y no repite al mismo.

## 1. Configurar el gestor (Cloudflare)
En el panel de Cloudflare → tu Worker → **Settings → Variables**, agrega:
- `WA_KEY` → una clave secreta larga que tú inventes (como contraseña). Márcala como **Secret/Encrypt**.
- `WA_USER` → tu nombre de usuario dentro del gestor.

Guarda y despliega.

## 2. Instalar en el VPS
```bash
cd ~
git clone https://github.com/iColorzz/clrzdesk.git
cd clrzdesk/avisos-vps
npm install
cp .env.example .env
nano .env        # llena GESTOR_URL, WA_KEY (la misma de Cloudflare) y WA_NUMBER (chip del bot)
node index.js    # muestra un código; vincúlalo en WhatsApp del chip del bot
```
Vincular: WhatsApp → Dispositivos vinculados → Vincular con número de teléfono → escribe el código.

## 3. Probar
Con el programa ya conectado, en otra terminal:
```bash
node index.js --now
```
Dispara el envío de inmediato (respeta el "no repetir").

## 4. Dejarlo 24/7
```bash
pm2 start index.js --name avisos-wa
pm2 save
```

## Comandos (desde tu número principal, por mensaje al chip)
- `.ayuda` — lista de comandos
- `.lista` — a quién le toca aviso (no manda nada)
- `.enviar` — manda ahorita los avisos pendientes
- `.estado` — conexión, hora y pausa
- `.pausa` / `.reanudar` — apaga o prende el envío automático
- `.hora 10:30` — cambia la hora del envío diario

Si un cliente contesta el aviso, su respuesta te llega reenviada a tu número principal.
Si los comandos no te responden, manda una vez `.soy CLAVE` (la `CMD_PIN` del .env).

## Ajustes (.env)
- `SEND_CRON` — hora del envío (cron, hora de México). `0 10 * * *` = 10 am.
- `MIN_DELAY` / `MAX_DELAY` — segundos de pausa entre mensajes.

## Ventana de aviso
Por defecto avisa de cuentas que vencen de 3 días antes hasta 3 días después.
Se controla con `?lo=` y `?hi=` en el endpoint si algún día quieres cambiarlo.

> Usa un chip aparte, no el de tu tienda. El envío automático sube el riesgo de baneo.
