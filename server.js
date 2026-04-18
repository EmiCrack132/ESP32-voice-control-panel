var express = require('express');
var app = express();
var server = require('http').Server(app);
const io = require('socket.io')(server);
const { spawn } = require('child_process');

app.use(express.static('public'));

let ArduinoSocketID = null;
let procesoVoz = null;
let vozActiva = false;

const pythonPath = './tx/.venv/Scripts/python.exe';

const oldLog = console.log;
console.log = function(...args) {
    oldLog(...args);
    io.sockets.emit('log', args.join(' '));
};

app.get('/iniciar-voz', function(req, res) {
    if (procesoVoz) {
        res.json({ ok: false, msg: 'Voz ya está corriendo' });
        return;
    }
    procesoVoz = spawn(pythonPath, ['./tx/tx_voz.py']);
    vozActiva = true;
    io.sockets.emit('voz_status', { activa: true });
    procesoVoz.stdout.on('data', (data) => console.log('VOZ:', data.toString().trim()));
    procesoVoz.stderr.on('data', (data) => console.log('VOZ ERR:', data.toString().trim()));
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
        procesoVoz.kill();
        procesoVoz = null;
        vozActiva = false;
        io.sockets.emit('voz_status', { activa: false });
    }
    res.json({ ok: true, msg: 'Voz detenido' });
});

app.get('/comando/:texto', function(req, res) {
    const cmd = req.params.texto.toUpperCase();
    if (ArduinoSocketID) {
        io.to(ArduinoSocketID).emit('comando', cmd);
        console.log('Comando web:', cmd);
        res.json({ ok: true, msg: 'Comando enviado: ' + cmd });
    } else {
        res.json({ ok: false, msg: 'ESP32 no conectado' });
    }
});

io.on('connection', function(socket) {
    console.log('Alguien conectado:', socket.id);

    socket.emit('esp32_status', { conectado: ArduinoSocketID !== null });
    socket.emit('voz_status', { activa: vozActiva });

    socket.on('arduino_conectado', function() {
        ArduinoSocketID = socket.id;
        console.log('ESP32 registrado:', ArduinoSocketID);
        io.sockets.emit('esp32_status', { conectado: true });
    });

    socket.on('comando', function(data) {
        console.log('Comando recibido:', data);
        if (ArduinoSocketID) {
            socket.broadcast.to(ArduinoSocketID).emit('comando', data);
        } else {
            console.log('ESP32 no conectado');
        }
    });

    socket.on('sensor', function(data) {
        console.log('Sensor:', data);
        io.sockets.emit('sensor', data);
    });

    socket.on('disconnect', function() {
        if (socket.id === ArduinoSocketID) {
            ArduinoSocketID = null;
            console.log('ESP32 desconectado');
            io.sockets.emit('esp32_status', { conectado: false });
        }
    });
});

server.listen(5001, function() {
    console.log("Servidor corriendo en el puerto 5001.");
});