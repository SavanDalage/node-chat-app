const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const Filter = require("bad-words");
const {
  generateMessage,
  generateLocationMessage,
} = require("./utils/messages");
const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
} = require("./utils/users");

// "dev": "env-cmd -f ./config/dev.env nodemon src/index.js",

const app = express(); // nowy server express
const server = http.createServer(app); // normalnie 'server' jest tworzony behind the scene i nie mamy do niego dostępu. Nie moglibyśmy wtedy go urzyć jako argumentu, dlatego wtorzymy server sami i używamy go jako argumentu do funkcji socketio(server)
const io = socketio(server);

const port = process.env.PORT || 3000; // tworzenie portu
const publicDirectoryPath = path.join(__dirname, "../public"); // tworzenie ścieżki do katalogi public

app.use(express.static(publicDirectoryPath));

//
//
//
//

io.on("connection", (socket) => {
  console.log("New WebSocket connection");

  socket.on("join", (options, callback) => {
    // odbiera callback z "user.js" join event
    const { error, user } = addUser({ id: socket.id, ...options });

    if (error) {
      return callback(error);
    }

    socket.join(user.room);

    // wysyłanie powitalnej wiadomości do usera, który dołączył do czatu
    const welcomeMessage = "Welcome to the server.";
    socket.emit("message", generateMessage(welcomeMessage), "Admin");
    // informowanie wszystkich pozostałych userów, że ktoś dołączył

    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        generateMessage(`${user.username} has joined ${user.room} channel.`),
        "Admin"
      );
    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });
    callback();
  });

  // przyjmowanie i rozpowszechnianie wiadomości od userów
  // również informacja zwrotna, że wiadomość dotarła do servera
  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);

    const filter = new Filter();

    if (filter.isProfane(message)) {
      return callback("Nie przeklinaj!");
    }

    io.to(user.room).emit("message", generateMessage(message), user.username);
    callback();
  });

  // przyjmowanie i rozpowszechnianie loklizacji od userów
  socket.on("sendLocation", ({ latitude, longitude }, callback) => {
    const user = getUser(socket.id);
    io.to(user.room).emit(
      "locationMessage",
      generateLocationMessage(
        `https://google.com/maps?q=${latitude},${longitude}`
      ),
      user.username
    );
    callback();
  });

  // wiadomość do wszystkich, że ktoś opuścił czar
  socket.on("disconnect", () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit(
        "message",
        generateMessage(`${user.username} has left channel.`),
        "Admin"
      );
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

server.listen(port, () => {
  console.log("Server is up on port " + port);
});
