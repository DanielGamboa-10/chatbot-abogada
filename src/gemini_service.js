import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contextFilePath = path.resolve(__dirname, '../config/legal_services_context.md');

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    this.systemInstruction = this.loadSystemContext();
    this.userSessions = new Map(); // senderId -> ChatSession
    this.genAI = null;

    if (this.apiKey) {
      this.initClient();
    }
  }

  loadSystemContext() {
    try {
      if (fs.existsSync(contextFilePath)) {
        return fs.readFileSync(contextFilePath, 'utf8');
      }
    } catch (error) {
      console.warn('⚠️ No se pudo leer legal_services_context.md:', error.message);
    }
    return 'Eres un asistente jurídico virtual profesional de un despacho de abogados.';
  }

  initClient() {
    this.genAI = new GoogleGenerativeAI(this.apiKey);
  }

  getChatSession(senderId) {
    if (!this.genAI) {
      this.apiKey = process.env.GEMINI_API_KEY || '';
      if (!this.apiKey) {
        throw new Error('Falta configurar GEMINI_API_KEY en el archivo .env');
      }
      this.initClient();
    }

    if (!this.userSessions.has(senderId)) {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        systemInstruction: this.systemInstruction,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800
        }
      });

      const chat = model.startChat({
        history: []
      });

      this.userSessions.set(senderId, {
        chat,
        lastInteraction: Date.now()
      });
    }

    const sessionData = this.userSessions.get(senderId);
    sessionData.lastInteraction = Date.now();
    return sessionData.chat;
  }

  async generateResponse(senderId, userMessage) {
    try {
      const chat = this.getChatSession(senderId);
      const result = await chat.sendMessage(userMessage);
      const responseText = result.response.text();
      return responseText.trim();
    } catch (error) {
      console.warn(`⚠️ Error en llamada principal de Gemini (${this.modelName}):`, error.message);

      // Intentar de inmediato con modelos de respaldo ante cualquier error (503, 429, 404, etc.)
      const fallbackModels = ['gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
      
      for (const fallbackModelName of fallbackModels) {
        if (fallbackModelName === this.modelName) continue;
        try {
          console.log(`🔄 Activando modelo de respaldo: ${fallbackModelName}...`);
          const fallbackModel = this.genAI.getGenerativeModel({
            model: fallbackModelName,
            systemInstruction: this.systemInstruction
          });
          const result = await fallbackModel.generateContent(userMessage);
          return result.response.text().trim();
        } catch (fallbackError) {
          console.warn(`⚠️ Modelo de respaldo ${fallbackModelName} falló:`, fallbackError.message);
        }
      }

      return 'Hola, gracias por comunicarte. En este momento tuvimos un pequeño retraso con la conexión. Por favor déjanos tu consulta y tu nombre, y te responderemos a la mayor brevedad posible.';
    }
  }

  resetSession(senderId) {
    this.userSessions.delete(senderId);
  }
}

export const geminiService = new GeminiService();
