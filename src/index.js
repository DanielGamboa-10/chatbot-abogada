import 'dotenv/config';
import http from 'http';
import { createWhatsAppClient } from './whatsapp_client.js';
import { scheduleGuard } from './schedule_guard.js';
import { geminiService } from './gemini_service.js';

console.log('====================================================');
console.log('⚖️  INICIANDO BOT DE ATENCIÓN LEGAL - WHATSAPP  ⚖️');
console.log('====================================================');

// Mini servidor HTTP para plataformas en la nube (Render, Railway, Koyeb, etc.)
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  const status = scheduleGuard.isWithinOperatingHours();
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({
    status: 'ONLINE',
    bot: 'Nathaly Gamboa | Consultoría Legal',
    scheduleStatus: status,
    timestamp: new Date().toISOString()
  }, null, 2));
}).listen(PORT, () => {
  console.log(`🌐 Servidor de monitoreo web activo en puerto ${PORT}`);
});

if (!process.env.GEMINI_API_KEY) {
  console.warn('\n⚠️ AVISO: No se ha detectado GEMINI_API_KEY en el archivo .env.');
  console.warn('   El bot podrá conectarse a WhatsApp, pero para que la IA responda');
  console.warn('   debes agregar tu clave de API en c:\\Users\\Danie\\Chatbot\\.env\n');
}

// Capturadores globales de errores para garantizar que el bot NUNCA se rompa ni se apague
process.on('uncaughtException', (err) => {
  console.error('🛡️ [Error Protegido - uncaughtException]:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('🛡️ [Error Protegido - unhandledRejection]:', reason);
});

async function handleIncomingMessage(sock, msg, messageData) {
  try {
    const remoteJid = msg.key?.remoteJid;
    if (!remoteJid) return;

    const pushName = msg.pushName || 'Cliente';
    const isGroup = remoteJid.endsWith('@g.us');

    // Ignorar grupos para enfocarse en atención individual de clientes
    if (isGroup) {
      return;
    }

    const { text: messageText, isMediaOnly } = messageData;

    console.log(`\n📩 Mensaje recibido de ${pushName} (${remoteJid}): "${messageText || '[Contenido Multimedia/Audio/Sticker]'}"`);

    // 1. Validar horario de atención
    const scheduleStatus = scheduleGuard.isWithinOperatingHours();

    if (!scheduleStatus.isOpen) {
      console.log(`⏰ [Fuera de Horario] Motivo: ${scheduleStatus.reason} | Hora actual: ${scheduleStatus.currentTime}`);

      if (scheduleGuard.shouldSendOffHoursNotification(remoteJid)) {
        const offHoursReply = scheduleGuard.getOffHoursMessage();
        console.log(`📤 Enviando mensaje automático de fuera de horario a ${pushName}...`);
        await sock.sendMessage(remoteJid, { text: offHoursReply }, { quoted: msg });
      } else {
        console.log(`⏳ Usuario ${pushName} ya recibió la notificación de fuera de horario recientemente.`);
      }
      return;
    }

    // 2. Si es solo audio, sticker o imagen sin texto en horario laboral
    if (isMediaOnly && !messageText) {
      console.log(`📎 Mensaje multimedia sin texto de ${pushName}. Enviando respuesta orientativa...`);
      const mediaPrompt = `¡Hola! 👋 Hemos recibido tu archivo. Para brindarte una orientación más ágil y precisa, por favor escríbenos en un mensaje de texto tu nombre y un breve resumen de tu caso o consulta. ¡Con gusto te atenderemos!`;
      await sock.sendMessage(remoteJid, { text: mediaPrompt }, { quoted: msg });
      return;
    }

    if (!messageText || messageText.trim().length === 0) {
      return;
    }

    // 3. Si está en horario de atención con texto, procesar con IA Google Gemini
    console.log(`🟢 [En Horario] Procesando con IA Google Gemini...`);

    // Indicador de "escribiendo..." en WhatsApp
    try {
      await sock.sendPresenceUpdate('composing', remoteJid);
    } catch (err) {}

    try {
      const aiResponse = await geminiService.generateResponse(remoteJid, messageText);
      console.log(`📤 Enviando respuesta de IA a ${pushName}...`);
      await sock.sendMessage(remoteJid, { text: aiResponse }, { quoted: msg });
    } catch (error) {
      console.error(`❌ Error al responder a ${remoteJid}:`, error.message);
    } finally {
      try {
        await sock.sendPresenceUpdate('paused', remoteJid);
      } catch (err) {}
    }
  } catch (criticalErr) {
    console.error('🛡️ [Error controlado en procesamiento de mensaje]:', criticalErr.message);
  }
}

// Iniciar cliente de WhatsApp
createWhatsAppClient({
  onMessage: handleIncomingMessage,
  onReady: () => {
    const tz = scheduleGuard.getTimezone();
    const now = scheduleGuard.getNow().toFormat('yyyy-MM-dd HH:mm:ss');
    console.log(`🕒 Zona horaria configurada: ${tz} (Hora actual: ${now})`);
  },
  onDisconnected: (code) => {
    console.log(`ℹ️ Estado de desconexión: ${code}`);
  }
}).catch((err) => {
  console.error('❌ Error crítico al iniciar el bot:', err);
});
