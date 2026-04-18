import socketio
import speech_recognition as sr

IP_SERVER = '192.168.8.7'

sio = socketio.Client()

@sio.event
def connect():
    print("Conectado al servidor")

sio.connect(f'http://{IP_SERVER}:5001')

r = sr.Recognizer()
mic = sr.Microphone()

while True:
    with mic as source:
        print("Grabando...")
        r.adjust_for_ambient_noise(source)
        audio = r.listen(source)
        print("Traduciendo...")
        try:
            text = r.recognize_google(audio, language="es-MX")
            text = text.upper()
            print(text)
            sio.emit('comando', text.strip())
        except sr.UnknownValueError:
            print("No se entendió el audio")
        except sr.RequestError as e:
            print("Error con Google: {0}".format(e))