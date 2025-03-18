const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});


let simulationStatus = {
    simulationRunning: false,
    technicalService: true,
    labelDoorsToggled: false,
    tubeDoorsToggled: { side1: false, side2: false },
    printedLabels: [],
    tubesLeft: { gold: 10, blue: 10, purple: 10, red: 10 },
    holdStatus: { x: false, y: false, z: false, g: false, r1: false, r3: false },
    currentValues: { x: 0, y: 0, z: 0, g: 0, r1: 0, r3: 0 },
    updateMode: { x: false, y: false, z: false, g: false, r1: false, r3: false }
};

io.on('connection', (socket) => {
    console.log('A user connected', socket.id);

    // Send current simulation status to each connected user
    if (simulationStatus.simulationRunning) {
        io.to(socket.id).emit('simulationStarted');
    }

    io.to(socket.id).emit('technicalServiceStatus', { status: simulationStatus.technicalService });
    io.to(socket.id).emit('labelDoorsToggled', { status: simulationStatus.labelDoorsToggled });
    io.to(socket.id).emit('tubeDoorsToggled', simulationStatus.tubeDoorsToggled);

    
    socket.on('startSimulation', () => {
        simulationStatus.simulationRunning = true;
        io.emit('simulationStarted'); 

        setInterval(() => {
            ['x', 'y', 'z', 'g', 'r1', 'r3'].forEach(axis => {
                if (!simulationStatus.holdStatus[axis] && !simulationStatus.updateMode[axis]) {
                    const randomValue = Math.floor(Math.random() * 101);
                    simulationStatus.currentValues[axis] = randomValue;
                    io.emit('axisValueUpdate', { axis, value: randomValue });
                }
            });
        }, 1000); 
    });

    
    socket.on('holdToggle', (axis) => {
        simulationStatus.holdStatus[axis] = !simulationStatus.holdStatus[axis];
        console.log(`${axis} axis hold status: ${simulationStatus.holdStatus[axis] ? 'paused' : 'resumed'}`);
    });

    
    socket.on('resetValue', (axis) => {
        simulationStatus.currentValues[axis] = 0;
        io.emit('axisValueUpdate', { axis, value: 0 })
        console.log(`${axis} axis value reset to 0`);
    });

    
    socket.on('updateValue', (data) => {
        const { axis, value } = data;
        simulationStatus.currentValues[axis] = value;
        simulationStatus.updateMode[axis] = true;  
        io.emit('axisValueUpdate', { axis, value });
        console.log(`${axis} axis updated with new value: ${value}`);
    });

    
    socket.on('setAlarm', () => {
        simulationStatus.technicalService = false;
        io.emit('technicalServiceStatus', { status: false });
    });

    socket.on('clearAlarm', () => {
        simulationStatus.technicalService = true;
        io.emit('technicalServiceStatus', { status: true });
    });

    
    socket.on('loadLabel', () => {
        simulationStatus.labelDoorsToggled = true;
        io.emit('labelToggled', { status: true }); 
    });

    
    socket.on('loadTube', (data) => {
        const side = data.side === '1' ? 'side1' : 'side2';
        simulationStatus.tubeDoorsToggled[side] = true;
        io.emit('tubeToggled', { side });  
    });

    
    socket.on('disconnect', () => {
        console.log('A user disconnected', socket.id);
    });
});

server.listen(4000, () => {
    console.log('Simülasyon sunucusu 4000 portunda çalışıyor');
});
