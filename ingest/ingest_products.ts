// ingest/ingest_products.ts 
//------------------------------------------------------------
// Carga de productos en la colección “productos” de Chroma.
//------------------------------------------------------------

import "dotenv/config";
import productos from "../productos";                   // tu array de productos
import { ChromaClient, OpenAIEmbeddingFunction } from "chromadb";

(async () => {
  /* 1️⃣  Cliente Chroma → conecta con tu servidor (Docker o Python).
         En la versión actual, la propiedad para la URL remota es `path`. */
  const client = new ChromaClient({
    path: process.env.CHROMA_URL ?? "http://localhost:8000",
  });

  /* 2️⃣  Función de embeddings con OpenAI 
         Nota: la clave correcta (según los tipos) es `openai_model`, 
         no `model`. */
  const embedFn = new OpenAIEmbeddingFunction({
    openai_api_key: process.env.OPENAI_API_KEY!,   
    openai_model: "text-embedding-3-small",        
  });

  /* 3️⃣  Crear o recuperar colección “productos” */
  const collection = await client.getOrCreateCollection({
    name: "productos",
    embeddingFunction: embedFn,
  });

  console.log(`ℹ️  Ingestando ${productos.length} productos …`);

  /* 4️⃣  Recorremos el array y añadimos documento por documento */
  for (let i = 0; i < productos.length; i++) {
    const p = productos[i];
    // Texto que vamos a indexar
    const texto = `${p.nombre}. ${p.descripcion}. Aliases: ${p.alias.join(", ")}`;

    /* 
      -> En `metadatas` solo se admiten tipos primitivos 
         (string | number | boolean). 
      -> Si quieres conservar el array de aliases, conviértelo a string.
    */
    await collection.add({
      ids:      [`prod-${i}`],       
      documents:[texto],             
      metadatas:[{
        nombre:      p.nombre,
        descripcion: p.descripcion,
        // aliás convertido a string para que los tipos queden válidos
        alias:       p.alias.join(", "),
      }],
    });

    console.log(`✅  ${p.nombre}`);
  }

  console.log("🚀  Ingesta de productos completada");
})();
