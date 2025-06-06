// src/rag.ts
//------------------------------------------------------------
// Recuperación aumentada (RAG) con Chroma (server) + OpenAI.
//------------------------------------------------------------

import "dotenv/config";
import {
  ChromaClient,
  OpenAIEmbeddingFunction,
  IncludeEnum,
} from "chromadb";
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const K_PRODUCTOS = 3;
const K_CHATS = 2;

export async function generarRespuesta(userMsg: string): Promise<string> {
  /* 1️⃣  Función de embeddings con OpenAI ---------------------------- */
  const embedFn = new OpenAIEmbeddingFunction({
    openai_api_key: process.env.OPENAI_API_KEY!,
    openai_model: "text-embedding-3-small", // ahora usamos `openai_model` en lugar de `model`
  });

  /* 2️⃣  Conexión al servidor Chroma ---------------------------------- */
  // Leer la URL (por ejemplo "http://localhost:8000") de CHROMA_URL en .env.
  const chroma = new ChromaClient({
    path: process.env.CHROMA_URL ?? "http://localhost:8000", // `path` en lugar de `baseUrl`
  });

  /* 3️⃣  Obtener las colecciones (productos y chats) ------------------ */
  const colProd = await chroma
    .getCollection({ name: "productos", embeddingFunction: embedFn })
    .catch(() => null);

  const colChats = await chroma
    .getCollection({ name: "chats", embeddingFunction: embedFn })
    .catch(() => null);

  /* 4️⃣  Recuperar contexto desde Chroma sin calcular embedding manual */
  // 4.1) Contexto de productos
  const ctxProd: string[] = colProd
    ? (
        await colProd.query({
          queryTexts: [userMsg],
          nResults: K_PRODUCTOS,
          include: [IncludeEnum.Documents],
        })
      ).documents?.[0]?.filter((t): t is string => !!t) ?? []
    : [];

  // 4.2) Contexto de chats
  const ctxChats: string[] = colChats
    ? (
        await colChats.query({
          queryTexts: [userMsg],
          nResults: K_CHATS,
          include: [IncludeEnum.Documents],
        })
      ).documents?.[0]?.filter((t): t is string => !!t) ?? []
    : [];

  // 4.3) Formatear el bloque de contexto
  const contexto =
    [
      ...ctxProd.map((t) => `Producto: ${t}`),
      ...ctxChats.map((t) => `Chat: ${t}`),
    ].join("\n---\n") || "Sin contexto";

  /* 5️⃣  Llamar a OpenAI Chat Completion ------------------------------ */
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: "Eres ArielBot, asesor experto de Colihue Aventura.",
    },
    {
      role: "system",
      content: contexto,
    },
    {
      role: "user",
      content: userMsg,
    },
  ];

  const chat = await openai.chat.completions.create({
    model: "gpt-4o", // o el modelo que prefieras
    messages,
    temperature: 0.7,
    max_tokens: 400,
  });

  return chat.choices[0].message.content?.trim() ?? "";
}
