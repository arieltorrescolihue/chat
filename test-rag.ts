// test-rag.ts
import "dotenv/config";
import { generarRespuesta } from "./src/rag";

(async () => {
  // Pon aquí una pregunta que coincida con algo de tu chats.csv o productos
  const pregunta = "¿Dónde envío?";  
  console.log("\n🤖 Pregunta de prueba:\n", pregunta);

  const respuesta = await generarRespuesta(pregunta).catch((e) => {
    console.error("❌ Error en generarRespuesta:", e);
    process.exit(1);
  });

  console.log("\n✉️  Respuesta RAG:\n", respuesta);
})();
