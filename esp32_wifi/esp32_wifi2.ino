#include <WiFi.h>
#include <WebSocketsClient.h>
#include <SocketIOclient.h>
#include "secrets.h"

const int   port     = 5001;
const int   LED      = 2;  // LED interno

SocketIOclient socketIO;

void socketIOEvent(socketIOmessageType_t type, uint8_t* payload, size_t length) {
    switch (type) {
        case sIOtype_CONNECT:
            Serial.println("ESP32-2 conectado");
            socketIO.send(sIOtype_EVENT, "[\"esp32_led2\",\"ok\"]");
            break;

        case sIOtype_EVENT: {
            String msg = String((char*)payload);
            msg.toUpperCase();
            if (msg.indexOf("ACTIVAR") >= 0) {
                digitalWrite(LED, HIGH);
                Serial.println("LED interno ON");
            } else if (msg.indexOf("DESACTIVAR") >= 0) {
                digitalWrite(LED, LOW);
                Serial.println("LED interno OFF");
            }
            break;
        }

        case sIOtype_DISCONNECT:
            Serial.println("ESP32-2 desconectado");
            break;

        default: break;
    }
}

void setup() {
    Serial.begin(115200);
    pinMode(LED, OUTPUT);

    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
    Serial.println("\nWiFi conectado: " + WiFi.localIP().toString());

    socketIO.begin(serverIP, port, "/socket.io/?EIO=4");
    socketIO.onEvent(socketIOEvent);
}

void loop() {
    socketIO.loop();
}