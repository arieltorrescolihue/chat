import readline from "node:readline";

export function aprobarRespuesta(texto: string): Promise<string | null> {
  return new Promise(res => {
    console.log("\n📝 BORRADOR:\n" + texto);
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question("\n¿Enviar? (y / n / e = editar): ", ans => {
      if (ans === "y") { rl.close(); return res(texto); }
      if (ans === "n") { rl.close(); return res(null); }
      rl.question("👉 Escribe tu versión:\n", nueva => { rl.close(); res(nueva); });
    });
  });
}
