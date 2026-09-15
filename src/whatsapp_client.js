import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const authFolderPath = path.resolve(__dirname, '../auth_info');

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

export async function createWhatsAppClient({ onMessage, onReady, onDisconnected }) {
  const { state, saveCreds } = await useMultiFileAuthState(authFolderPath);
  const { version, isLatest } = await fetchLatestBaileysVersion();

  const isPairingCodeEnabled = process.env.USE_PAIRING_CODE === 'true';
  let phoneNumber = (process.env.PHONE_NUMBER || '').replace(/[^0-9]/g, '');

  console.log(`🤖 Iniciando WhatsApp Bot con Baileys v${version.join('.')}${isLatest ? ' (última versión)' : ''}`);

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
    },
    browser: Browsers.ubuntu('Chrome'),
    printQRInTerminal: false,
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 10000
  });

  sock.ev.on('creds.update', saveCreds);

  // Solicitar código de vinculación por número si no está registrado aún
  if (isPairingCodeEnabled && !sock.authState.creds.registered) {
    if (!phoneNumber) {
      console.log('\n=============================================================');
      console.log('📱 VINCULACIÓN POR NÚMERO DE TELÉFONO (SIN CÓDIGO QR)');
      console.log('=============================================================');
      phoneNumber = await askQuestion('👉 Ingresa el número de WhatsApp de la abogada con código de país (ej: 573001234567): ');
      phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
    }

    if (phoneNumber) {
      setTimeout(async () => {
        try {
          console.log(`\n⏳ Solicitando código de vinculación para el número: +${phoneNumber}...`);
          const code = await sock.requestPairingCode(phoneNumber);
          console.log('\n=============================================================');
          console.log('🔑 CÓDIGO DE VINCULACIÓN DE WHATSAPP:');
          console.log(`\n       👉  [ ${code} ]  👈\n`);
          console.log('Instrucciones para la abogada en su celular:');
          console.log(' 1. Abrir WhatsApp > Ajustes (o los 3 puntos) > Dispositivos vinculados');
          console.log(' 2. Tocar "Vincular un dispositivo"');
          console.log(' 3. Abajo tocar la opción "Vincular con el número de teléfono en su lugar"');
          console.log(` 4. Escribir este código: ${code}`);
          console.log('=============================================================\n');
        } catch (err) {
          console.error('❌ Error al solicitar el código de vinculación:', err.message);
        }
      }, 3000);
    }
  }

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Solo mostrar QR si no se está usando Pairing Code
    if (qr && !isPairingCodeEnabled) {
      console.log('\n=============================================================');
      console.log('📱 ESCANEA ESTE CÓDIGO QR CON WHATSAPP EN TU TELÉFONO:');
      console.log('   (WhatsApp > Ajustes / Menú > Dispositivos vinculados > Vincular un dispositivo)');
      console.log('=============================================================\n');
      qrcode.generate(qr, { small: true });
      console.log('=============================================================\n');
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(`⚠️ Conexión cerrada. Código de estado: ${statusCode}. Reconectando: ${shouldReconnect}`);

      if (onDisconnected) {
        onDisconnected(statusCode);
      }

      if (shouldReconnect) {
        setTimeout(() => {
          createWhatsAppClient({ onMessage, onReady, onDisconnected });
        }, 3000);
      } else {
        console.log('❌ Sesión cerrada permanentemente. Por favor elimina la carpeta auth_info y vuelve a iniciar.');
      }
    } else if (connection === 'open') {
      console.log('\n=============================================================');
      console.log('✅ ¡CONEXIÓN EXITOSA CON WHATSAPP!');
      console.log('📌 Bot activo y listo para atender mensajes de clientes.');
      console.log('=============================================================\n');
      if (onReady) {
        onReady(sock);
      }
    }
  });

  sock.ev.on('messages.upsert', async (chatUpdate) => {
    try {
      if (chatUpdate.type !== 'notify') return;

      for (const msg of chatUpdate.messages) {
        if (!msg.message) continue;
        if (msg.key?.fromMe) continue; // Ignorar mensajes enviados por el propio bot

        // Extraer texto según tipo de mensaje
        const messageContent =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          msg.message.imageMessage?.caption ||
          msg.message.videoMessage?.caption ||
          msg.message.documentMessage?.caption ||
          msg.message.buttonsResponseMessage?.selectedButtonId ||
          msg.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
          msg.message.templateButtonReplyMessage?.selectedId ||
          '';

        const isMediaOnly = !messageContent && (
          !!msg.message.audioMessage ||
          !!msg.message.imageMessage ||
          !!msg.message.videoMessage ||
          !!msg.message.stickerMessage ||
          !!msg.message.documentMessage ||
          !!msg.message.contactMessage ||
          !!msg.message.locationMessage
        );

        if (onMessage) {
          await onMessage(sock, msg, { text: messageContent, isMediaOnly });
        }
      }
    } catch (upsertErr) {
      console.error('🛡️ [Error controlado en messages.upsert]:', upsertErr.message);
    }
  });

  return sock;
}
