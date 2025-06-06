import "dotenv/config";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";

export async function getVectorStore(collection = "productos") {
  const embeddings = new OpenAIEmbeddings();
  return await Chroma.fromExistingCollection(embeddings, {
    collectionName: collection,
    persistDirectory: process.env.CHROMA_DIR ?? "./.chroma_db",
  } as any);
}
