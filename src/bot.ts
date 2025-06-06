import "dotenv/config";
import { Client, LocalAuth } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import puppeteer from "puppeteer";
import { generarRespuesta } from "./rag";
import { aprobarRespuesta } from "./uiCli";

// ──────────────────────────────────────────────────────────────────────
// 1) Parcheamos Puppeteer para inyectar window.__name en todas las páginas
//    nuevas y evitar un bug que a veces ocurre en WhatsApp Web.
// ──────────────────────────────────────────────────────────────────────
const patchedPuppeteer = {
  ...puppeteer,

  launch: async (options: any) => {
    // Lanzamos el navegador real con las opciones recibidas
    const browser = await puppeteer.launch(options);

    // Interceptamos newPage para inyectar __name
    const originalNewPage = browser.newPage.bind(browser);

    // ⚡ Eliminamos el spread args: newPage() NO acepta argumentos
    browser.newPage = async () => {
      const page = await originalNewPage();
      await page.evaluateOnNewDocument(() => {
        if (typeof (window as any).__name !== "function") {
          (window as any).__name = () => {};
        }
      });
      return page;
    };

    return browser;
  },
};

// ──────────────────────────────────────────────────────────────────────
// 2) Creamos e inicializamos el Cliente de WhatsApp Web:
//    - Usamos LocalAuth para guardar la sesión en disco.
//    - Le pasamos nuestro patch de Puppeteer en `puppeteer`.
//    - Las opciones concretas (headless, ruta, flags) van DENTRO de `puppeteer`.
// ──────────────────────────────────────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth(),

  // ⚡ Movemos headless, executablePath y args dentro de `puppeteer`
  puppeteer: {
    ...(patchedPuppeteer as any),             // forzamos a any para silenciar los tipos
    headless: true,                           // antes estaba en puppeteerOptions
    executablePath: puppeteer.executablePath(), // antes estaba en puppeteerOptions
    args: [                                   // antes estaba en puppeteerOptions
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
  } as any,                                  // forzamos a any para que encaje con ClientOptions
});

// ──────────────────────────────────────────────────────────────────────
// 3) Eventos básicos
// ──────────────────────────────────────────────────────────────────────

// 3.1) Cuando WhatsApp Web necesite un QR (solo la primera vez):
client.on("qr", (qr: string) => {
  console.log("📱 Escanea este QR con tu WhatsApp para iniciar sesión:\n");
  qrcode.generate(qr, { small: true });
});

// 3.2) Cuando el bot esté listo y haya conectado tu sesión:
client.on("ready", () => {
  console.log("🤖 WA listo");
});

// 3.3) Cada vez que llegue un mensaje nuevo:
client.on("message", async (msg: any) => {
  if (msg.fromMe) return;

  try {
    // 1️⃣ Generar borrador con RAG
    const borrador = await generarRespuesta(msg.body as string);

    // 2️⃣ Preguntar si enviamos, descartamos o editamos
    const aprobado = await aprobarRespuesta(borrador);

    // 3️⃣ Si aprobaste, enviamos con client.sendMessage
    if (aprobado) {
      await client.sendMessage(msg.from, aprobado as string);
    }
  } catch (err) {
    console.error("❌ Error al procesar mensaje:", err);
  }
});

// 3.4) Inicializamos el cliente
client.initialize();
