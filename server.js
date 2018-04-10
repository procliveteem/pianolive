const http = require('http');
const path = require('path');
const express = require('express');
const socketio = require('socket.io');

const app = express();
const server = http.Server(app);
const io = socketio(server);

app.use(express.static(path.join(__dirname, 'build')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

io.on('connection', socket => {
  socket.on('room', room => {
    room = room || 'default';
    socket.join(room);
  });
  socket.on('noteOn', data => {
    const room = JSON.parse(data).room || 'default';
    socket.in(room).broadcast.emit('noteOn', data);
  });
  socket.on('noteOff', data => {
    const room = JSON.parse(data).room || 'default';
    socket.in(room).broadcast.emit('noteOff', data);
  });
  console.log('a user connected');
});

server.listen(process.env.PORT || 4000, () => {
  console.log(`listening on *:4000`);
});
