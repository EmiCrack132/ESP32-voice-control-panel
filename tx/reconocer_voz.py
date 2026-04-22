#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
reconocer_voz.py
Recibe audio crudo (WAV PCM 16kHz mono) por stdin, lo reconoce con
Google Speech Recognition en español mexicano y devuelve el texto
a stdout. Node.js llama a este script como proceso hijo.
"""

import sys
import io
import json
import speech_recognition as sr

IDIOMA = "es-MX"

def main():
    # Leer todos los bytes de stdin (el buffer WAV que manda Node)
    audio_bytes = sys.stdin.buffer.read()

    if not audio_bytes:
        resultado = {"ok": False, "error": "Sin datos de audio", "texto": ""}
        print(json.dumps(resultado))
        sys.stdout.flush()
        return

    recognizer = sr.Recognizer()

    try:
        # AudioFile acepta un file-like object con datos WAV válidos
        audio_file = io.BytesIO(audio_bytes)
        with sr.AudioFile(audio_file) as source:
            audio_data = recognizer.record(source)

        texto = recognizer.recognize_google(audio_data, language=IDIOMA)
        texto = texto.upper().strip()

        resultado = {"ok": True, "texto": texto, "error": ""}

    except sr.UnknownValueError:
        resultado = {"ok": False, "texto": "", "error": "No se entendió el audio"}

    except sr.RequestError as e:
        resultado = {"ok": False, "texto": "", "error": f"Error Google API: {e}"}

    except Exception as e:
        resultado = {"ok": False, "texto": "", "error": f"Error inesperado: {e}"}

    print(json.dumps(resultado, ensure_ascii=False))
    sys.stdout.flush()


if __name__ == "__main__":
    main()