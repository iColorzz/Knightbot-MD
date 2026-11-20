const { addWelcome, delWelcome, isWelcomeOn, addGoodbye, delGoodBye, isGoodByeOn } = require('../lib/index');
const { delay } = require('@whiskeysockets/baileys');

async function handleWelcome(sock, chatId, message, match) {
    if (!match) {
        return sock.sendMessage(chatId, {
            text: `📥 *Configuración de bienvenida*\n\n✅ *.welcome on* — Activar bienvenida\n🛠️ *.welcome set Tu mensaje* — Poner mensaje personalizado\n🚫 *.welcome off* — Desactivar bienvenida\n\n*Variables disponibles:*\n• {user} - Menciona al nuevo miembro\n• {group} - Nombre del grupo\n• {description} - Descripción del grupo`,
            quoted: message
        });
    }

    const [command, ...args] = match.split(' ');
    const lowerCommand = command.toLowerCase();
    const customMessage = args.join(' ');

    if (lowerCommand === 'on') {
        if (await isWelcomeOn(chatId)) {
            return sock.sendMessage(chatId, { text: '⚠️ La bienvenida *ya está activada*.', quoted: message });
        }
        await addWelcome(chatId, true, 'Welcome {user} to {group}! 🎉');
        return sock.sendMessage(chatId, { text: '✅ Bienvenida *activada* con mensaje simple. Usa *.welcome set [tu mensaje]* para personalizar.', quoted: message });
    }

    if (lowerCommand === 'off') {
        if (!(await isWelcomeOn(chatId))) {
            return sock.sendMessage(chatId, { text: '⚠️ La bienvenida *ya está desactivada*.', quoted: message });
        }
        await delWelcome(chatId);
        return sock.sendMessage(chatId, { text: '✅ Bienvenida *desactivada* para este grupo.', quoted: message });
    }

    if (lowerCommand === 'set') {
        if (!customMessage) {
            return sock.sendMessage(chatId, { text: '⚠️ Escribe un mensaje de bienvenida. Ejemplo: *.welcome set ¡Bienvenido al grupo!*', quoted: message });
        }
        await addWelcome(chatId, true, customMessage);
        return sock.sendMessage(chatId, { text: '✅ Mensaje de bienvenida *guardado*.', quoted: message });
    }

    // If no valid command is provided
    return sock.sendMessage(chatId, {
        text: `❌ Comando inválido. Usa:\n*.welcome on* - Activar\n*.welcome set [mensaje]* - Personalizar\n*.welcome off* - Desactivar`,
        quoted: message
    });
}

async function handleGoodbye(sock, chatId, message, match) {
    const lower = match?.toLowerCase();

    if (!match) {
        return sock.sendMessage(chatId, {
            text: `📤 *Configuración de despedida*\n\n✅ *.goodbye on* — Activar despedida\n🛠️ *.goodbye set Tu mensaje* — Poner mensaje personalizado\n🚫 *.goodbye off* — Desactivar despedida\n\n*Variables disponibles:*\n• {user} - Menciona al que se va\n• {group} - Nombre del grupo`,
            quoted: message
        });
    }

    if (lower === 'on') {
        if (await isGoodByeOn(chatId)) {
            return sock.sendMessage(chatId, { text: '⚠️ La despedida *ya está activada*.', quoted: message });
        }
        await addGoodbye(chatId, true, 'Goodbye {user} 👋');
        return sock.sendMessage(chatId, { text: '✅ Despedida *activada* con mensaje simple. Usa *.goodbye set [tu mensaje]* para personalizar.', quoted: message });
    }

    if (lower === 'off') {
        if (!(await isGoodByeOn(chatId))) {
            return sock.sendMessage(chatId, { text: '⚠️ La despedida *ya está desactivada*.', quoted: message });
        }
        await delGoodBye(chatId);
        return sock.sendMessage(chatId, { text: '✅ Despedida *desactivada* para este grupo.', quoted: message });
    }

    if (lower.startsWith('set ')) {
        const customMessage = match.substring(4);
        if (!customMessage) {
            return sock.sendMessage(chatId, { text: '⚠️ Escribe un mensaje de despedida. Ejemplo: *.goodbye set ¡Hasta luego!*', quoted: message });
        }
        await addGoodbye(chatId, true, customMessage);
        return sock.sendMessage(chatId, { text: '✅ Mensaje de despedida *guardado*.', quoted: message });
    }

    // If no valid command is provided
    return sock.sendMessage(chatId, {
        text: `❌ Comando inválido. Usa:\n*.goodbye on* - Activar\n*.goodbye set [mensaje]* - Personalizar\n*.goodbye off* - Desactivar`,
        quoted: message
    });
}

module.exports = { handleWelcome, handleGoodbye };
// This code handles welcome and goodbye messages in a WhatsApp group using the Baileys library.