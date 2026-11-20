const settings = require('../settings');
const fs = require('fs');
const path = require('path');

async function helpCommand(sock, chatId, message) {
    const helpMessage = `
╔═══════════════════╗
   *🤖 ${settings.botName || 'CLRBOT'}*
   Versión: *${settings.version || '3.0.0'}*
   por ${settings.botOwner || 'CLRStreaming'}
╚═══════════════════╝

*Lista de comandos:*

╔═══════════════════╗
🌐 *Generales*:
║ ➤ .help / .menu — muestra este menú
║ ➤ .ping — mide la velocidad del bot
║ ➤ .alive — comprueba si el bot está activo
║ ➤ .tts <texto> — convierte texto en voz
║ ➤ .owner — datos del dueño
║ ➤ .joke — un chiste
║ ➤ .quote — una frase
║ ➤ .fact — un dato curioso
║ ➤ .weather <ciudad> — el clima
║ ➤ .news — noticias
║ ➤ .attp <texto> — texto animado en sticker
║ ➤ .lyrics <canción> — letra de una canción
║ ➤ .8ball <pregunta> — la bola mágica responde
║ ➤ .groupinfo — info del grupo
║ ➤ .staff / .admins — lista de admins
║ ➤ .vv — reenvía una foto de ver una vez
║ ➤ .vv2 — reenvía ver una vez al privado
║ ➤ .trt <texto> <idioma> — traduce texto
║ ➤ .ss <link> — captura de una página web
║ ➤ .jid — muestra el ID del chat
║ ➤ .url — sube una imagen y da su link
╚═══════════════════╝

╔═══════════════════╗
👮‍♂️ *Administración*:
║ ➤ .ban @usuario — veta a alguien del bot
║ ➤ .promote @usuario — lo hace admin
║ ➤ .demote @usuario — le quita admin
║ ➤ .mute <minutos> — silencia el grupo
║ ➤ .unmute — reactiva el grupo
║ ➤ .delete / .del — borra un mensaje
║ ➤ .kick @usuario — saca a alguien del grupo
║ ➤ .warnings @usuario — ve sus advertencias
║ ➤ .warn @usuario — le da una advertencia
║ ➤ .antilink — borra links de no-admins
║ ➤ .antibadword — borra groserías
║ ➤ .clear — limpia el chat
║ ➤ .tag <mensaje> — menciona a todos con texto
║ ➤ .tagall — menciona a todos
║ ➤ .tagnotadmin — menciona a los que no son admin
║ ➤ .hidetag <mensaje> — menciona a todos oculto
║ ➤ .chatbot — activa respuestas con IA
║ ➤ .resetlink — cambia el link del grupo
║ ➤ .antitag <on/off> — bloquea menciones masivas
║ ➤ .welcome <on/off> — mensaje de bienvenida
║ ➤ .goodbye <on/off> — mensaje de despedida
║ ➤ .antibot <on/off/set/get> — bloquea otros bots
║ ➤ .setgdesc <texto> — cambia la descripción del grupo
║ ➤ .setgname <nombre> — cambia el nombre del grupo
║ ➤ .setgpp (responde a imagen) — cambia la foto del grupo
║ ➤ .groupstatus [texto] — estado del grupo
╚═══════════════════╝

╔═══════════════════╗
🔒 *Dueño*:
║ ➤ .mode <public/private> — bot público o privado
║ ➤ .clearsession — limpia la sesión
║ ➤ .antidelete — recupera mensajes borrados
║ ➤ .cleartmp — borra archivos temporales
║ ➤ .update — actualiza el bot
║ ➤ .settings — ajustes del bot
║ ➤ .setpp (responde a imagen) — foto de perfil del bot
║ ➤ .autoreact <on/off> — reacciona solo a mensajes
║ ➤ .autostatus <on/off> — ve los estados solo
║ ➤ .autostatus react <on/off> — reacciona a estados
║ ➤ .savestatus [on/off] — guarda estados
║ ➤ .autotyping <on/off> — simula que escribe
║ ➤ .autoread <on/off> — marca mensajes como leídos
║ ➤ .anticall <on/off> — rechaza llamadas
║ ➤ .pmblocker <on/off/status> — bloquea mensajes al privado
║ ➤ .pmblocker setmsg <texto> — mensaje del bloqueo
║ ➤ .setmention (responde a msg) — mensaje al mencionar
║ ➤ .mention <on/off> — respuesta al mencionar
╚═══════════════════╝

╔═══════════════════╗
🎨 *Imágenes y Stickers*:
║ ➤ .blur <imagen> — difumina una imagen
║ ➤ .simage (responde a sticker) — sticker a imagen
║ ➤ .sticker (responde a imagen) — imagen a sticker
║ ➤ .removebg — quita el fondo
║ ➤ .remini — mejora la calidad
║ ➤ .crop (responde sticker/imagen/video) — recorta
║ ➤ .tgsticker <link> — stickers de Telegram
║ ➤ .meme — un meme
║ ➤ .take <nombre> — renombra un sticker
║ ➤ .emojimix <emj1>+<emj2> — mezcla emojis
║ ➤ .igs <link insta> — historia de Instagram
║ ➤ .igsc <link insta> — foto de perfil de Instagram
╚═══════════════════╝

╔═══════════════════╗
🎮 *Juegos*:
║ ➤ .tictactoe @usuario — gato (tres en raya)
║ ➤ .hangman — el ahorcado
║ ➤ .guess <letra> — adivina la letra
║ ➤ .trivia — preguntas de trivia
║ ➤ .answer <respuesta> — responde la trivia
║ ➤ .truth — verdad
║ ➤ .dare — reto
╚═══════════════════╝

╔═══════════════════╗
🤖 *Inteligencia Artificial*:
║ ➤ .ai <pregunta> — pregúntale a la IA
║ ➤ .gpt <pregunta> — ChatGPT
║ ➤ .gemini <pregunta> — Gemini
║ ➤ .imagine <descripción> — genera una imagen
║ ➤ .flux <descripción> — genera imagen (Flux)
║ ➤ .sora <descripción> — genera imagen (Sora)
╚═══════════════════╝

╔═══════════════════╗
🎯 *Diversión*:
║ ➤ .compliment @usuario — un halago
║ ➤ .insult @usuario — un insulto (de broma)
║ ➤ .flirt — una frase coqueta
║ ➤ .shayari — un verso
║ ➤ .goodnight — buenas noches
║ ➤ .roseday — día de la rosa
║ ➤ .character @usuario — análisis de personalidad
║ ➤ .wasted @usuario — efecto "wasted"
║ ➤ .ship @usuario — compatibilidad amorosa
║ ➤ .simp @usuario — tarjeta de simp
║ ➤ .stupid @usuario [texto] — meme "is stupid"
╚═══════════════════╝

╔═══════════════════╗
🔤 *Texto con estilo*:
║ ➤ .metallic <texto> — efecto metálico
║ ➤ .ice <texto> — efecto hielo
║ ➤ .snow <texto> — efecto nieve
║ ➤ .impressive <texto> — estilo impresionante
║ ➤ .matrix <texto> — estilo Matrix
║ ➤ .light <texto> — estilo luz
║ ➤ .neon <texto> — estilo neón
║ ➤ .devil <texto> — estilo diablo
║ ➤ .purple <texto> — estilo morado
║ ➤ .thunder <texto> — estilo rayo
║ ➤ .leaves <texto> — estilo hojas
║ ➤ .1917 <texto> — estilo 1917
║ ➤ .arena <texto> — estilo arena
║ ➤ .hacker <texto> — estilo hacker
║ ➤ .sand <texto> — estilo arena (desierto)
║ ➤ .blackpink <texto> — estilo Blackpink
║ ➤ .glitch <texto> — estilo glitch
║ ➤ .fire <texto> — estilo fuego
╚═══════════════════╝

╔═══════════════════╗
📥 *Descargas*:
║ ➤ .play <canción> — reproduce audio
║ ➤ .song <canción> — descarga la canción
║ ➤ .spotify <búsqueda> — descarga de Spotify
║ ➤ .instagram <link> — descarga de Instagram
║ ➤ .facebook <link> — descarga de Facebook
║ ➤ .twitter <link> — descarga de Twitter/X
║ ➤ .tiktok <link> — descarga de TikTok
║ ➤ .video <nombre> — descarga un video
║ ➤ .ytmp4 <link> — video de YouTube
╚═══════════════════╝

╔═══════════════════╗
🧩 *Varios*:
║ ➤ .heart — marco de corazón
║ ➤ .horny — tarjeta "horny"
║ ➤ .circle — recorte circular
║ ➤ .lgbt — marco LGBT
║ ➤ .lolice — meme policía loli
║ ➤ .its-so-stupid — meme "so stupid"
║ ➤ .namecard — tarjeta de nombre
║ ➤ .oogway — frase de Oogway
║ ➤ .tweet — genera un tweet falso
║ ➤ .ytcomment — comentario de YouTube falso
║ ➤ .comrade — efecto camarada
║ ➤ .gay — marco gay
║ ➤ .glass — efecto vidrio
║ ➤ .jail — tras las rejas
║ ➤ .passed — efecto "passed"
║ ➤ .triggered — efecto triggered
╚═══════════════════╝

╔═══════════════════╗
🖼️ *Anime*:
║ ➤ .nom — morder
║ ➤ .poke — picar
║ ➤ .cry — llorar
║ ➤ .kiss — beso
║ ➤ .pat — caricia
║ ➤ .hug — abrazo
║ ➤ .wink — guiño
║ ➤ .facepalm — facepalm
╚═══════════════════╝

╔═══════════════════╗
💻 *GitHub*:
║ ➤ .git — info del repositorio
║ ➤ .github — info del repositorio
║ ➤ .sc — código fuente
║ ➤ .script — código fuente
║ ➤ .repo — repositorio
╚═══════════════════╝

CLRStreaming · clrcolorz.shop`;

    try {
        const imagePath = path.join(__dirname, '../assets/bot_image.jpg');
        
        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            
            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: helpMessage,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '',
                        newsletterName: 'CLRStreaming',
                        serverMessageId: -1
                    }
                }
            },{ quoted: message });
        } else {
            console.error('Bot image not found at:', imagePath);
            await sock.sendMessage(chatId, { 
                text: helpMessage,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '',
                        newsletterName: 'CLRStreaming',
                        serverMessageId: -1
                    } 
                }
            });
        }
    } catch (error) {
        console.error('Error in help command:', error);
        await sock.sendMessage(chatId, { text: helpMessage });
    }
}

module.exports = helpCommand;