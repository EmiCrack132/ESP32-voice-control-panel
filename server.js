/**
 * server.js
 * Puerto: 5001  (igual al hardcodeado en los ESP32)
 *
 * ESP1 se identifica con evento "arduino_conectado"
 *   → escucha texto que contenga: PRENDER / ENCENDER / APAGAR
 * ESP2 se identifica con evento "esp32_led2"
 *   → escucha texto que contenga: ACTIVAR / DESACTIVAR
 *
 * Flujo de voz:
 *   modo "wake"    → detectar ARMANDO
 *   modo "command" → detectar comando y mandarlo al ESP correcto
 */

const express   = require("express");
const http      = require("http");
const socketIO  = require("socket.io");
const { spawn } = require("child_process");
const path      = require("path");

const PORT          = process.env.PORT || 5001;
const PYTHON_EXE    = path.join(__dirname, "tx", ".venv", "Scripts", "python.exe");
const PYTHON_SCRIPT = path.join(__dirname, "tx", "reconocer_voz.py");
const WAKE_WORD     = "ARMANDO";

/**
 * palabraVoz : lo que llega del STT (en MAYÚSCULAS)
 * payload    : string que va dentro del evento "comando" que ya leen los ESP
 * target     : "esp1" | "esp2"
 */
const COMANDOS = [
  { palabraVoz: "PRENDER",     payload: "PRENDER",    target: "esp1" },
  { palabraVoz: "ENCENDER",    payload: "ENCENDER",   target: "esp1" },
  { palabraVoz: "APAGAR",      payload: "APAGAR",     target: "esp1" },
  { palabraVoz: "ACTIVAR",     payload: "ACTIVAR",    target: "esp2" },
  { palabraVoz: "INTERRUMPIR", payload: "DESACTIVAR", target: "esp2" },
];

const app    = express();
const server = http.createServer(app);
const io     = socketIO(server);

app.use(express.static(path.join(__dirname, "public")));

// IDs de socket de cada ESP (null si no está conectado)
const espSockets = { esp1: null, esp2: null };
const webSockets = new Set();

// ── Helpers ───────────────────────────────────────────────────────
function detectarComando(texto) {
  for (const cmd of COMANDOS) {
    if (texto.includes(cmd.palabraVoz)) return cmd;
  }
  return null;
}

function notificarEstadoEsp() {
  const status = { esp1: !!espSockets.esp1, esp2: !!espSockets.esp2 };
  webSockets.forEach(id => io.to(id).emit("esp_status", status));
}

function reconocerAudio(wavBuffer) {
  return new Promise((resolve, reject) => {
    const py = spawn(PYTHON_EXE, [PYTHON_SCRIPT]);
    let stdout = "", stderr = "";
    py.stdout.on("data", c => stdout += c.toString());
    py.stderr.on("data", c => stderr += c.toString());
    py.on("close", code => {
      if (code !== 0) return reject(new Error(`Python ${code}: ${stderr}`));
      try { resolve(JSON.parse(stdout.trim())); }
      catch { reject(new Error(`JSON inválido: ${stdout}`)); }
    });
    py.on("error", reject);
    py.stdin.write(wavBuffer);
    py.stdin.end();
  });
}

// ── Socket.io ─────────────────────────────────────────────────────
io.on("connection", socket => {
  console.log(`[SOCKET] Nuevo cliente: ${socket.id}`);

  // Navegador
  socket.on("identificar", data => {
    if (data?.tipo === "web") {
      webSockets.add(socket.id);
      socket.tipo = "web";
      console.log(`[WEB] Registrado: ${socket.id}`);
      socket.emit("esp_status", { esp1: !!espSockets.esp1, esp2: !!espSockets.esp2 });
    }
  });

  // ESP1 — se identifica con el evento que ya tiene en su código
  socket.on("arduino_conectado", () => {
    espSockets.esp1 = socket.id;
    socket.esEsp    = "esp1";
    console.log(`[ESP1] Conectado: ${socket.id}`);
    notificarEstadoEsp();
  });

  // ESP2 — se identifica con el evento que ya tiene en su código
  socket.on("esp32_led2", () => {
    espSockets.esp2 = socket.id;
    socket.esEsp    = "esp2";
    console.log(`[ESP2] Conectado: ${socket.id}`);
    notificarEstadoEsp();
  });

  // Sensor del ESP1
  socket.on("sensor", valor => {
    webSockets.forEach(id => io.to(id).emit("sensor_data", {
      valor: Number(valor),
      ts: Date.now(),
    }));
  });

  // Audio del navegador
  socket.on("audio_chunk", async payload => {
    const modo = payload.modo || "wake";
    try {
      const wavBuffer = Buffer.isBuffer(payload.wav)
        ? payload.wav
        : Buffer.from(payload.wav);

      console.log(`[AUDIO] ${wavBuffer.length} B — modo: ${modo}`);
      socket.emit("procesando", { estado: true });

      const resultado = await reconocerAudio(wavBuffer);
      console.log(`[STT] (${modo}):`, resultado);

      if (resultado.ok && resultado.texto) {
        const texto = resultado.texto; // ya en MAYÚSCULAS desde Python

        if (modo === "wake") {
          socket.emit("texto_reconocido", {
            texto, modo,
            esWake: texto.includes(WAKE_WORD),
            comando: null,
          });

        } else {
          const cmd = detectarComando(texto);

          if (cmd) {
            console.log(`[CMD] "${cmd.palabraVoz}" → "${cmd.payload}" → ${cmd.target}`);

            // Mandar al ESP correcto con el payload que ya entiende su código
            const espId = espSockets[cmd.target];
            if (espId) {
              io.to(espId).emit("comando", cmd.payload);
              console.log(`[CMD] Enviado a ${cmd.target} (${espId})`);
            } else {
              console.warn(`[CMD] ${cmd.target} no conectado`);
            }

            socket.emit("texto_reconocido", {
              texto, modo,
              comando: cmd.palabraVoz,
              payload: cmd.payload,
              target:  cmd.target,
              enviado: !!espId,
            });

            io.emit("comando_enviado", {
              palabraVoz: cmd.palabraVoz,
              payload:    cmd.payload,
              target:     cmd.target,
              texto,
            });

          } else {
            socket.emit("texto_reconocido", { texto, modo, comando: null });
          }
        }

      } else {
        socket.emit("texto_reconocido", {
          texto: "", modo,
          error: resultado.error || "Sin resultado",
          comando: null,
        });
      }

    } catch (err) {
      console.error("[ERROR]", err.message);
      socket.emit("texto_reconocido", { texto: "", modo, error: err.message, comando: null });
    } finally {
      socket.emit("procesando", { estado: false });
    }
  });

  // Desconexión
  socket.on("disconnect", () => {
    webSockets.delete(socket.id);
    if (socket.esEsp === "esp1") { espSockets.esp1 = null; console.log("[ESP1] Desconectado"); }
    if (socket.esEsp === "esp2") { espSockets.esp2 = null; console.log("[ESP2] Desconectado"); }
    notificarEstadoEsp();
  });
});

// ── Arranque ──────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n✅  http://localhost:${PORT}`);
  console.log(`    ESP1 → PRENDER / ENCENDER / APAGAR`);
  console.log(`    ESP2 → ACTIVAR / INTERRUMPIR (→ DESACTIVAR)\n`);
});