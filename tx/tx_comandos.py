import socketio

IP_SERVER = '192.168.0.192'

sio = socketio.Client()

@sio.event
def connect():
    print("Conectado al servidor")

@sio.event
def disconnect():
    print("Desconectado")

sio.connect(f'http://{IP_SERVER}:5001')

while True:
    comando = input('Introduzca el comando: ')
    sio.emit('comando', comando.strip())