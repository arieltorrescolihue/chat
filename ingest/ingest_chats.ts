// ingest/ingest_chats.ts
//------------------------------------------------------------
// Este script lee un CSV “pregunta,respuesta” y lo indexa en
// la colección “chats” de Chroma.
//------------------------------------------------------------

import "dotenv/config";
import fs from "node:fs/promises";
import { ChromaClient, OpenAIEmbeddingFunction } from "chromadb";

(async () => {
  // 1️⃣ Leemos el CSV “datasets/chats.csv”
  const csv = await fs.readFile("datasets/chats.csv", { encoding: "utf-8" });
  // Separamos líneas, recortamos espacios y eliminamos vacías
  const filas = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // 2️⃣ Cliente Chroma → se conecta al servidor que tengas corriendo
  const client = new ChromaClient({
    path: process.env.CHROMA_URL ?? "http://localhost:8000",
  });

  // 3️⃣ Función de embeddings con OpenAI
  const embedFn = new OpenAIEmbeddingFunction({
    openai_api_key: process.env.OPENAI_API_KEY!,
    openai_model: "text-embedding-3-small", // ahora usa `openai_model`
  });

  // 4️⃣ Crear o recuperar colección “chats”
  const collection = await client.getOrCreateCollection({
    name: "chats",
    embeddingFunction: embedFn,
  });

  console.log(`ℹ️  Ingestando ${filas.length} chats …`);

  // 5️⃣ Recorremos cada línea del CSV
  for (let i = 0; i < filas.length; i++) {
    // Dividimos solo en la primera coma para evitar problemas si hay comas en la pregunta o respuesta
    const linea = filas[i];
    const idxComa = linea.indexOf(",");
    let q: string, a: string;

    if (idxComa === -1) {
      // Si no hay coma, asumimos línea mal formateada
      q = linea.trim();
      a = "";
    } else {
      q = linea.slice(0, idxComa).trim();
      a = linea.slice(idxComa + 1).trim();
    }

    // Texto que indexamos: “Q: <pregunta> R: <respuesta>”
    const texto = `Q: ${q} R: ${a}`;

    // 6️⃣ Añadimos a la colección
    await collection.add({
      ids:       [`chat-${i}`],            // ID único para cada par pregunta/respuesta
      documents: [texto],                  // Contenido textual para embeddings
      metadatas: [{ pregunta: q, respuesta: a }], // metadata con strings (válido)
    });

    process.stdout.write(`✅  Chat ${i + 1}/${filas.length} indexado\n`);
  }

  console.log("🚀  Ingesta de chats completada");
})();
