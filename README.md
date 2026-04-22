# Armando AI — ESP32 Voice Control

Sistema de control por voz para dos ESP32 usando Node.js, Socket.io y Google Speech-to-Text. Di **"Armando"** y luego un comando de voz; el servidor lo reconoce y lo envía al ESP32 correcto en tiempo real.

---

## Estructura del proyecto

```
proyecto/
├── public/
│   └── index.html          ← Interfaz web (slime, gráfica, log)
├── tx/
│   ├── reconocer_voz.py    ← Script Python: STT con Google via SpeechRecognition
│   └── .venv/              ← Entorno virtual Python
├── server.js               ← Servidor Node.js + Socket.io
├── secrets.h               ← (en ESP32) WiFi credentials
└── README.md
```

---

## Cómo funciona

```
Micrófono → Navegador → server.js → reconocer_voz.py → Google STT
                                  ↓
                          Detecta "ARMANDO"
                                  ↓
                     Escucha comando de voz
                                  ↓
              ESP1 (PRENDER/ENCENDER/APAGAR)
              ESP2 (ACTIVAR/INTERRUMPIR)
```

1. La página graba en bucle continuo esperando la **wake word "ARMANDO"**
2. Al detectarla, Armando responde **"Sí mi majestad"** por voz y espera un comando
3. El servidor identifica el comando y lo manda por Socket.io al ESP32 correcto
4. El ESP32 reacciona con su lógica ya cargada (sin necesidad de reprogramarlo)

---

## Dependencias

### Node.js
```bash
npm install express socket.io
```

### Python
```bash
cd tx
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install SpeechRecognition
```
> `reconocer_voz.py` es el **único script Python** del proyecto. Node lo invoca como proceso hijo, le pasa el audio WAV por `stdin` y lee el JSON de resultado por `stdout`.

---

## Ejecutar el servidor

```bash
node server.js
```

Abre `http://localhost:5001` en el navegador. Permite el acceso al micrófono cuando el navegador lo pida.

---

## Comandos de voz

| Lo que dices   | Va a  | Acción en ESP         |
|----------------|-------|-----------------------|
| `PRENDER`      | ESP1  | `digitalWrite(LED, HIGH)` |
| `ENCENDER`     | ESP1  | `digitalWrite(LED, HIGH)` |
| `APAGAR`       | ESP1  | `digitalWrite(LED, LOW)`  |
| `ACTIVAR`      | ESP2  | `digitalWrite(LED, HIGH)` |
| `INTERRUMPIR`  | ESP2  | `digitalWrite(LED, LOW)`  |

> **Nota:** `INTERRUMPIR` se traduce a `DESACTIVAR` internamente antes de enviarse al ESP2, que es la palabra que ya tiene en su código.

---

## Conexión del sensor (ESP1 — pin 34)

El ESP1 lee un **fotoresistor (LDR)** en el pin analógico 34. El circuito es un divisor de tensión:

```
3.3V
 │
 ├── [Fotoresistor / LDR]
 │
 ├──────────────────── Pin 34 (ADC)
 │
 ├── [Resistencia 100kΩ]
 │
GND
```

La foto-R va entre **3.3V y el nodo**, y la resistencia de 100kΩ va entre **el nodo y GND**. El pin 34 se conecta al nodo central (entre los dos componentes). Conforme cambia la luz, cambia la resistencia de la LDR y por tanto el voltaje que lee el ADC (0–4095).

La lectura se envía al servidor cada 500 ms y se grafica en tiempo real en la interfaz web.

---

## Identificación de los ESP32

Los ESP32 **no necesitan modificarse**. El servidor los reconoce por el evento que ya emiten al conectarse:

| ESP  | Evento de identificación | LED  |
|------|--------------------------|------|
| ESP1 | `arduino_conectado`      | pin 15 |
| ESP2 | `esp32_led2`             | pin 2  |

---

## Requisitos de red

- El PC con Node.js y los ESP32 deben estar en la **misma red WiFi**
- El puerto usado es **5001** (hardcodeado en ambos ESP32)
- Los ESP32 apuntan a `serverIP` definido en `secrets.h`

```cpp
// secrets.h
const char* ssid     = "TU_WIFI";
const char* password = "TU_PASSWORD";
const char* serverIP = "192.168.X.X";  // IP local del PC
```

---

## Notas

- Se requiere conexión a internet para que `reconocer_voz.py` pueda llamar a la **API de Google Speech** (gratuita con límites).
- El idioma de reconocimiento es **español mexicano (`es-MX`)**.
- La ruta al ejecutable Python en `server.js` asume Windows. En Linux/Mac cambiar a:
  ```js
  const PYTHON_EXE = path.join(__dirname, "tx", ".venv", "bin", "python");
  ```