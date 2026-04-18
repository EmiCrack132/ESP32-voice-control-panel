# ESP32 Voice Control Panel

Control de un LED y lectura de sensor de luz (fotoresistencia) con ESP32 vía WiFi y Socket.IO, con reconocimiento de voz y panel web en tiempo real.

---

## ¿Cómo funciona?

```
Voz / Texto → Python → Node.js Server → ESP32 (WiFi) → LED
                                ↑
                         ESP32 → Sensor → Server → Página web
```

---

## Estructura del proyecto

```
servidor-esp32/
├── server.js           # Servidor Node.js con Socket.io
├── public/
│   └── index.html      # Panel web de control
├── tx/
│   ├── .venv/          # Entorno virtual Python
│   ├── tx_comandos.py  # Envío de comandos por texto
│   └── tx_voz.py       # Reconocimiento de voz con Google
└── esp32_wifi/
    ├── esp32_wifi.ino      # Código del ESP32
    ├── secrets.example.h   # Plantilla de credenciales
    └── secrets.h           # Credenciales reales
```

---

## Requisitos

### Hardware

* ESP32 (30 pines)
* LED en GPIO15
* Fotoresistencia + resistencia 100KΩ (divisor de voltaje) en GPIO34

### Software

* Node.js v18+
* Python 3.10+
* Arduino IDE con soporte ESP32

### Librerías Arduino

* `WebSockets` by Markus Sattler (2.7.2)
* `SocketIOclient` by Vincent Wyszynski (0.3)

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/esp32-voice-control-panel.git
cd esp32-voice-control-panel
```

---

### 2. Instalar dependencias Node.js

```bash
npm install express socket.io
```

---

### 3. Configurar credenciales del ESP32 (IMPORTANTE)

Por seguridad, las credenciales WiFi no están incluidas en el repositorio.

1. Ve a la carpeta:

```
esp32_wifi/
```

2. Copia el archivo de ejemplo:

```bash
cp secrets.example.h secrets.h
```

> En Windows puedes hacerlo manualmente (copiar y renombrar).

3. Edita `secrets.h` y coloca tus datos reales:

```cpp
#pragma once

const char* ssid     = "TU_WIFI_REAL";
const char* password = "TU_PASSWORD_REAL";
const char* serverIP = "XXX.XXX.X.X";  // IP de tu computadora
```



---

### 4. Crear entorno virtual Python e instalar dependencias

```bash
cd tx
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install python-socketio[client]==4.6.1 python-engineio==3.14.2 SpeechRecognition pyaudio
cd ..
```

---

### 5. Flashear el ESP32

Abre `esp32_wifi/esp32_wifi.ino` en Arduino IDE.

El archivo usa `secrets.h` para las credenciales, así que asegúrate de haberlo configurado antes.

Luego simplemente sube el código al ESP32.

---

## Uso

### 1. Iniciar el servidor

```bash
node server.js
```

### 2. Conectar el ESP32

Enciende el ESP32 (con pila o USB). En la terminal verás:

```
ESP32 registrado: xxxx
```

### 3. Abrir el panel web

```
http://localhost:5001
```

### 4. Enviar comandos

Desde el panel web puedes:

* Escribir `ENCENDER` o `APAGAR`
* Usar el micrófono con reconocimiento de voz en español

O desde Python:

```bash
cd tx
.venv\Scripts\activate
python tx_comandos.py
python tx_voz.py
```

---

## Palabras clave reconocidas

| Comando            | Efecto          |
| ------------------ | --------------- |
| ENCENDER / PRENDER | Enciende el LED |
| APAGAR             | Apaga el LED    |

---

## Panel web

* Estado del ESP32 en tiempo real
* Indicador del LED (on/off)
* Gráfica del sensor de luz en tiempo real
* Icono dinámico: ☀ luz alta · ◑ luz media · ☽ poca luz
* Log del servidor en vivo
* Control por voz y texto desde el navegador

---

## Circuito del sensor

```
3.3V ──── FotoR ──┬──── GPIO34
                  │
               R 100KΩ
                  │
                GND
```

---

## Tecnologías

* Node.js + Express + Socket.IO
* Python + python-socketio + SpeechRecognition
* ESP32 + SocketIOclient + WebSockets
* HTML/CSS/JS con Canvas API

---

## Seguridad

Este proyecto utiliza un archivo `secrets.h` para manejar credenciales sensibles.

* `secrets.h` → contiene tus datos reales (NO se sube)
* `secrets.example.h` → plantilla pública

Esto evita exponer tu red WiFi al subir el proyecto a GitHub.
