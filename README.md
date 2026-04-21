# ESP32 Control Panel

Control de LEDs y lectura de sensor de luz con dos ESP32 vía WiFi y Socket.io, con reconocimiento de voz desde el navegador y panel web en tiempo real.

---

## Flujo del sistema

```
Navegador (voz/texto) → Node.js Server → ESP32-1 → LED GPIO15
                                        → ESP32-2 → LED interno GPIO2

ESP32-1 → Sensor GPIO34 → Server → Panel web (gráfica en tiempo real)
```

---

## Estructura del proyecto

```
servidor-esp32/
├── server.js               # Servidor Node.js con Socket.io
├── public/
│   └── index.html          # Panel web de control
├── tx/
│   ├── .venv/              # Entorno virtual Python
│   ├── tx_comandos.py      # Envío de comandos por texto
│   └── tx_voz.py           # Reconocimiento de voz con Google
└── esp32_wifi/
    ├── esp32_wifi.ino      # Código ESP32 #1 (LED + sensor)
    └── esp32_wifi_2.ino    # Código ESP32 #2 (LED interno)
```

---

## Hardware

| Componente | Detalle |
|---|---|
| ESP32 #1 | LED en GPIO15, fotoresistencia en GPIO34 |
| ESP32 #2 | LED interno GPIO2 |
| Fotoresistencia | Divisor de voltaje con resistencia 100KΩ |

### Circuito del sensor (ESP32 #1)

```
3.3V ──── FotoR ──┬──── GPIO34
                  │
               R 100KΩ
                  │
                GND
```

### Circuito del LED (ESP32 #1)

```
GPIO15 ──── R 220Ω ──── LED ──── GND
```

---

## Requisitos

### Software
- Node.js v18+
- Python 3.10+
- Arduino IDE con soporte ESP32

### Librerías Arduino (ambos ESP32)
- `WebSockets` by Markus Sattler — v2.7.2
- `SocketIOclient` by Vincent Wyszynski — v0.3

---

## Instalación

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/servidor-esp32.git
cd servidor-esp32
```

### 2. Instalar dependencias Node.js
```bash
npm install express socket.io
```

### 3. Crear entorno virtual Python
```bash
cd tx
python -m venv .venv
.venv\Scripts\activate
pip install "python-socketio[client]==4.6.1" "python-engineio==3.14.2" SpeechRecognition pyaudio
cd ..
```

### 4. Configurar los ESP32

En **esp32_wifi.ino** (ESP32 #1):
```cpp
const char* ssid     = "TU_WIFI";
const char* password = "TU_PASSWORD";
const char* serverIP = "XXX.XXX.X.X";  // IP de tu compu
```
El evento de identificación es `arduino_conectado`.

En **esp32_wifi_2.ino** (ESP32 #2):
```cpp
const char* ssid     = "TU_WIFI";
const char* password = "TU_PASSWORD";
const char* serverIP = "XXX.XXX.X.X";  // IP de tu compu
```
El evento de identificación es `esp32_led2`.

### 5. Subir el código a cada ESP32 desde Arduino IDE

---

## Uso

### 1. Iniciar el servidor
```bash
node server.js
```

### 2. Conectar los ESP32
Enciende cada ESP32. En la terminal verás:
```
ESP32-1 registrado: xxxx
ESP32-2 registrado: xxxx
```

### 3. Abrir el panel web
```
http://localhost:5001
```
Otros dispositivos en la misma red pueden entrar con:
```
http://192.168.X.X:5001
```

---

## Comandos

| Comando | ESP32 | Efecto |
|---|---|---|
| ENCENDER / PRENDER | ESP32 #1 | Enciende LED GPIO15 |
| APAGAR | ESP32 #1 | Apaga LED GPIO15 |
| ACTIVAR | ESP32 #2 | Enciende LED interno GPIO2 |
| DESACTIVAR | ESP32 #2 | Apaga LED interno GPIO2 |

---

## Panel web

- Estado en tiempo real de ESP32 #1 y ESP32 #2
- Indicador LED (on/off) sincronizado con el estado real
- Sensor de luz con icono dinámico: ☀ alta · ◑ media · ☽ baja
- Gráfica del sensor en tiempo real (últimos 60 valores)
- Reconocimiento de voz activable desde el navegador
- Campo de texto para enviar comandos manualmente
- Log del servidor en vivo con colores por tipo de mensaje

---

## Notas

- El micrófono de voz corre en la máquina donde está el servidor, no en el navegador del cliente
- El sensor ADC del ESP32 devuelve valores de 0 a 4095
- Si el ESP32 se desconecta, el panel lo detecta automáticamente y actualiza el estado

---

## Tecnologías

- **Node.js** + Express + Socket.io 2.x
- **Python** + python-socketio + SpeechRecognition
- **ESP32** + SocketIOclient + WebSockets
- **HTML / CSS / JS** con Canvas API y Space Mono + DM Sans