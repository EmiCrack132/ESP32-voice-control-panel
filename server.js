var express = require('express');
var app = express();
var server = require('http').Server(app);
const io = require('socket.io')(server);
const { spawn, exec } = require('child_process');

app.use(express.static('public'));

let ESP32_LED = null;
let ESP32_LED2 = null;
let procesoVoz = null;
let vozActiva = false;

const pythonPath = './tx/.venv/Scripts/python.exe';

const oldLog = console.log;
console.log = function(...args) {
    oldLog(...args);
    io.sockets.emit('log', args.join(' '));
};

app.get('/iniciar-voz', function(req, res) {
    if (vozActiva) { res.json({ ok: false, msg: 'Voz ya está corriendo' }); return; }
    procesoVoz = spawn(pythonPath, ['./tx/tx_voz.py']);
    vozActiva = true;
    io.sockets.emit('voz_status', { activa: true });
    procesoVoz.stdout.on('data', (d) => console.log('VOZ:', d.toString().trim()));
    procesoVoz.stderr.on('data', (d) => console.log('VOZ ERR:', d.toString().trim()));
    procesoVoz.on('close', () => {
        procesoVoz = null;
        vozActiva = false;
        io.sockets.emit('voz_status', { activa: false });
        console.log('Voz terminado');
    });
    res.json({ ok: true, msg: 'Voz iniciado' });
});

app.get('/detener-voz', function(req, res) {
    if (procesoVoz) {
        exec('taskkill /PID ' + procesoVoz.pid + ' /T /F', (err) => {
            if (err) console.log('Error al matar proceso:', err.message);
        });
        procesoVoz = null;
        vozActiva = false;
        io.sockets.emit('voz_status', { activa: false });
    }
    res.json({ ok: true, msg: 'Voz detenido' });
});

app.get('/comando/:texto', function(req, res) {
    const cmd = req.params.texto.toUpperCase();
    let enviado = false;

    if (ESP32_LED && (cmd.includes('ENCENDER') || cmd.includes('PRENDER') || cmd.includes('APAGAR'))) {
        io.to(ESP32_LED).emit('comando', cmd);
        console.log('Comando a ESP32-1:', cmd);
        enviado = true;
    }

    if (ESP32_LED2 && (cmd.includes('ACTIVAR') || cmd.includes('INTERRUMPIR'))) {
        io.to(ESP32_LED2).emit('comando', cmd);
        console.log('Comando a ESP32-2:', cmd);
        enviado = true;
    }

    if (!enviado) {
        res.json({ ok: false, msg: 'Ningún ESP32 disponible para ese comando' });
    } else {
        res.json({ ok: true, msg: 'Comando enviado: ' + cmd });
    }
});

io.on('connection', function(socket) {
    console.log('Alguien conectado:', socket.id);

    socket.emit('esp32_status', { led: ESP32_LED !== null, led2: ESP32_LED2 !== null });
    socket.emit('voz_status', { activa: vozActiva });

    socket.on('arduino_conectado', function() {
        ESP32_LED = socket.id;
        console.log('ESP32-1 registrado:', socket.id);
        io.sockets.emit('esp32_status', { led: true, led2: ESP32_LED2 !== null });
    });

    socket.on('esp32_led2', function() {
        ESP32_LED2 = socket.id;
        console.log('ESP32-2 registrado:', socket.id);
        io.sockets.emit('esp32_status', { led: ESP32_LED !== null, led2: true });
    });

    socket.on('comando', function(data) {
        console.log('Comando recibido:', data);
        const cmd = data.toUpperCase();

        if (cmd.includes('ENCENDER') || cmd.includes('PRENDER') || cmd.includes('APAGAR')) {
            if (ESP32_LED) io.to(ESP32_LED).emit('comando', cmd);
        }
        if (cmd.includes('ACTIVAR') || cmd.includes('DESACTIVAR')) {
            if (ESP32_LED2) io.to(ESP32_LED2).emit('comando', cmd);
        }
    });

    socket.on('sensor', function(data) {
        console.log('Sensor:', data);
        io.sockets.emit('sensor', data);
    });

    socket.on('disconnect', function() {
        if (socket.id === ESP32_LED) {
            ESP32_LED = null;
            console.log('ESP32-1 desconectado');
            io.sockets.emit('esp32_status', { led: false, led2: ESP32_LED2 !== null });
        }
        if (socket.id === ESP32_LED2) {
            ESP32_LED2 = null;
            console.log('ESP32-2 desconectado');
            io.sockets.emit('esp32_status', { led: ESP32_LED !== null, led2: false });
        }
    });
});

server.listen(5001, function() {
    console.log("Servidor corriendo en el puerto 5001.");
});