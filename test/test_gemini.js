import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function testModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  
  for (const modelName of ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest']) {
    try {
      console.log(`Probando modelo: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Hola, confirma en una frase que estás listo para atender consultas jurídicas.');
      console.log(`✅ ¡Éxito con ${modelName}!`);
      console.log(`Respuesta: "${result.response.text().trim()}"\n`);
      return modelName;
    } catch (err) {
      console.log(`⚠️ ${modelName} falló:`, err.message);
    }
  }
}

testModels();
