// Setup basic express server
var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('../..')(server);
var port = process.env.PORT || 3000;
var users = [];
var playerCards = [];
var palo;
const maxUsers = 2;


server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));

// Chatroom

var numUsers = 0;

io.on('connection', (socket) => {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', (data) => {
    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', (username) => {
    if (addedUser) return;

    // we store the username in the socket session for this client
      if (users.length < maxUsers) {
          socket.username = username;
          ++numUsers;
          addedUser = true;
          users.push(username);
          console.log(users);
          socket.emit('login', {
              numUsers: numUsers,
              listUsers: users
          });
          // echo globally (all clients) that a person has connected
          socket.broadcast.emit('user joined', {
              listUsers: users,
              username: socket.username,
              numUsers: numUsers
          });
      } else console.log("troppi utenti");
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', () => {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', () => {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  socket.on('get list users', (username) => {
        console.log("get users list");
          socket.emit('users list', {
              users: users
          });

  });

  // when the user disconnects.. perform this
  socket.on('disconnect', () => {
    if (addedUser) {
      --numUsers;
      const i = users.indexOf(socket.username);
      users.splice(i,1);
      console.log(users);

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });

  socket.on('start game', () => {
    console.log('start game server');
    console.log(socket.username);

      socket.broadcast.emit('start', users);

      });

  socket.on('scelta palo', (data) => {
      palo = data;
      console.log(data);
      console.log("eintri in scelta palo nel server ?");
      socket.broadcast.emit('palo' , {
        palo: palo
      });
      console.log(palo);
  });

  socket.on('delete palo', () => {
    socket.broadcast.emit('palo eliminato');
  });

  socket.on('bussa',() => {
    socket.broadcast.emit('ho bussato', socket.username);
  });

  socket.on('carte',(data) => {
    socket.broadcast.emit('carte date', {
      username: data.username,
      carte: data.carte
    })
    socket.emit('carte date', {
      username: data.username,
      carte: data.carte
    })
  })

  socket.on('delete carte' , () => {
    socket.broadcast.emit ('carte elminate');
  });

  socket.on('spinotti', (data) => {
      socket.broadcast.emit ('numero spinotti',data);
  });

  socket.on('giro', (data) => {
      socket.broadcast.emit('numero giro', data);
  })
});
