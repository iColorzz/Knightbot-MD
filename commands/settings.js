const fs = require('fs');

function readJsonSafe(path, fallback) {
    try {
        const txt = fs.readFileSync(path, 'utf8');
        return JSON.parse(txt);
    } catch (_) {
        return fallback;
    }
}

const isOwnerOrSudo = require('../lib/isOwner');

async function settingsCommand(sock, chatId, message) {
    try {
        const senderId = message.key.participant || message.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        
        if (!message.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, { text: 'Solo el dueño del bot puede usar este comando.' }, { quoted: message });
            return;
        }

        const isGroup = chatId.endsWith('@g.us');
        const dataDir = './data';

        const mode = readJsonSafe(`${dataDir}/messageCount.json`, { isPublic: true });
        const autoStatus = readJsonSafe(`${dataDir}/autoStatus.json`, { enabled: false });
        const autoread = readJsonSafe(`${dataDir}/autoread.json`, { enabled: false });
        const autotyping = readJsonSafe(`${dataDir}/autotyping.json`, { enabled: false });
        const pmblocker = readJsonSafe(`${dataDir}/pmblocker.json`, { enabled: false });
        const anticall = readJsonSafe(`${dataDir}/anticall.json`, { enabled: false });
        const userGroupData = readJsonSafe(`${dataDir}/userGroupData.json`, {
            antilink: {}, antibadword: {}, welcome: {}, goodbye: {}, chatbot: {}, antitag: {}
        });
        const autoReaction = Boolean(userGroupData.autoReaction);

        // Per-group features
        const groupId = isGroup ? chatId : null;
        const antilinkOn = groupId ? Boolean(userGroupData.antilink && userGroupData.antilink[groupId]) : false;
        const antibadwordOn = groupId ? Boolean(userGroupData.antibadword && userGroupData.antibadword[groupId]) : false;
        const welcomeOn = groupId ? Boolean(userGroupData.welcome && userGroupData.welcome[groupId]) : false;
        const goodbyeOn = groupId ? Boolean(userGroupData.goodbye && userGroupData.goodbye[groupId]) : false;
        const chatbotOn = groupId ? Boolean(userGroupData.chatbot && userGroupData.chatbot[groupId]) : false;
        const antitagCfg = groupId ? (userGroupData.antitag && userGroupData.antitag[groupId]) : null;

        const lines = [];
        lines.push('*AJUSTES DEL BOT*');
        lines.push('');
        lines.push(`• Modo: ${mode.isPublic ? 'Público' : 'Privado'}`);
        lines.push(`• Ver estados: ${autoStatus.enabled ? 'Activado' : 'Apagado'}`);
        lines.push(`• Marcar leído: ${autoread.enabled ? 'Activado' : 'Apagado'}`);
        lines.push(`• Simular escribir: ${autotyping.enabled ? 'Activado' : 'Apagado'}`);
        lines.push(`• Bloqueo privados: ${pmblocker.enabled ? 'Activado' : 'Apagado'}`);
        lines.push(`• Rechazar llamadas: ${anticall.enabled ? 'Activado' : 'Apagado'}`);
        lines.push(`• Reacción automática: ${autoReaction ? 'Activado' : 'Apagado'}`);
        if (groupId) {
            lines.push('');
            lines.push(`Grupo: ${groupId}`);
            if (antilinkOn) {
                const al = userGroupData.antilink[groupId];
                lines.push(`• Antilink: Activado (acción: ${al.action || 'delete'})`);
            } else {
                lines.push('• Antilink: Apagado');
            }
            if (antibadwordOn) {
                const ab = userGroupData.antibadword[groupId];
                lines.push(`• Antigroserías: Activado (acción: ${ab.action || 'delete'})`);
            } else {
                lines.push('• Antigroserías: Apagado');
            }
            lines.push(`• Bienvenida: ${welcomeOn ? 'Activado' : 'Apagado'}`);
            lines.push(`• Despedida: ${goodbyeOn ? 'Activado' : 'Apagado'}`);
            lines.push(`• Chatbot IA: ${chatbotOn ? 'Activado' : 'Apagado'}`);
            if (antitagCfg && antitagCfg.enabled) {
                lines.push(`• Antitag: Activado (acción: ${antitagCfg.action || 'delete'})`);
            } else {
                lines.push('• Antitag: Apagado');
            }
        } else {
            lines.push('');
            lines.push('Nota: Los ajustes por grupo se muestran al usar el comando dentro de un grupo.');
        }

        await sock.sendMessage(chatId, { text: lines.join('\n') }, { quoted: message });
    } catch (error) {
        console.error('Error in settings command:', error);
        await sock.sendMessage(chatId, { text: 'No se pudieron leer los ajustes.' }, { quoted: message });
    }
}

module.exports = settingsCommand;


