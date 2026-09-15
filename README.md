# ⚖️ Chatbot de WhatsApp para Despacho Legal con IA Google Gemini

Chatbot automatizado para WhatsApp diseñado para abogadas y despachos jurídicos. Cuenta con **inteligencia artificial (Google Gemini)** para atender consultas legales y cotizaciones, además de un **sistema estricto de control de horarios** con respuestas automáticas fuera de jornada.

---

## 🌟 Métodos de Vinculación Disponibles

1. **🔑 Vinculación por Número de Teléfono (Pairing Code de 8 dígitos) - [ACTIVO POR DEFECTO]**:
   - No necesitas escanear códigos QR con la cámara.
   - Pones el número de teléfono con código de país (ej: `573001234567`) y el bot te genera un código de 8 letras/números (ej: `ABC-123-XY`).
   - La abogada solo entra a WhatsApp > *Dispositivos vinculados* > *Vincular con número de teléfono* y escribe el código.

2. **📱 Vinculación por Código QR**:
   - Si prefieres escanear el QR tradicional, solo cambias `USE_PAIRING_CODE=false` en el archivo [`.env`](file:///c:/Users/Danie/Chatbot/.env).

---

## ⏰ Control de Horarios de Atención

- **En horario laboral**: La IA de Google Gemini responde con empatía, conocimiento legal, detalles de servicios, formas de pago y tarifas de consulta.
- **Fuera de horario**: Envía automáticamente un mensaje cortés indicando el horario de atención e invitando a dejar los datos del caso para ser atendido en cuanto inicie la jornada.
- **Protección anti-spam**: Si un cliente envía varios mensajes seguidos fuera de horario, solo recibe la notificación una vez cada período de tiempo configurable (ej. cada 60 minutos).

---

## 📁 Estructura del Proyecto

```text
Chatbot/
├── config/
│   ├── legal_services_context.md   <-- Información del despacho, precios y servicios
│   └── schedule.json               <-- Horarios de atención y mensaje de fuera de horario
├── src/
│   ├── gemini_service.js           <-- Conexión y memoria de chat con Google Gemini
│   ├── schedule_guard.js           <-- Lógica de validación de horas y días laborales
│   ├── whatsapp_client.js          <-- Cliente de WhatsApp Baileys (Soporta Pairing Code y QR)
│   └── index.js                    <-- Punto de entrada principal
├── test/
│   └── test_schedule.js            <-- Pruebas de verificación de horarios
├── .env.example                    <-- Plantilla de variables de entorno
├── .env                            <-- Tu configuración privada (API Key y número)
└── package.json
```

---

## 🚀 Guía Rápida de Puesta en Marcha

### 1. Clave de API de Gemini
1. Obtén tu clave gratis en [Google AI Studio](https://aistudio.google.com/).
2. Ábrela y pégala en [`.env`](file:///c:/Users/Danie/Chatbot/.env) en `GEMINI_API_KEY=...`.

### 2. Número de WhatsApp
En el archivo [`.env`](file:///c:/Users/Danie/Chatbot/.env), puedes escribir el número de la abogada en `PHONE_NUMBER=` (con código de país, ej: `573001234567`) o dejarlo vacío para que te lo pida en la consola al iniciar.

### 3. Personalizar Información y Horarios
- Edita [`config/legal_services_context.md`](file:///c:/Users/Danie/Chatbot/config/legal_services_context.md) con los precios reales y áreas del derecho.
- Edita [`config/schedule.json`](file:///c:/Users/Danie/Chatbot/config/schedule.json) con los horarios de atención.

### 4. Iniciar el Bot
Ejecuta en la terminal:

```bash
npm start
```

El bot te mostrará el código de 8 dígitos para que la abogada lo ingrese en su WhatsApp y quede conectado.
