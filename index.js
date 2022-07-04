const express = require("express");
const socketio = require("socket.io");
const http = require("http");
const app = express();
const router = require("./router");
const PORT = process.env.port || 5000;
const { addUser, removeUser, getUser, getUsersInRoom } = require("./users");

const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("new connection");

  socket.on("join", ({ name, room }, callback = () => {}) => {
    console.log(room, name);
    const { error, user } = addUser({ id: socket.id, name, room });

    if (error) return callback(error);

    socket.emit("message", {
      user: "admin",
      text: `Voila,${user.name} you are now on room ${user.room}`,
    });

    socket.broadcast.to(user.room).emit("message", {
      user: "admin",
      text: `${user.name} entered the room`,
    });

    socket.join(user.room);

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });
    // callback();
  });

  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);

    io.to(user.room).emit("message", { user: user.name, text: message });
    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    callback();
  });

  socket.on("disconnect", () => {
    console.log("user left");
    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit("message", {
        user: "admin",
        text: `${user.name} has left`,
      });
    }
  });
});

app.use(router);

server.listen(PORT, () => {
  console.log("server started");
});
