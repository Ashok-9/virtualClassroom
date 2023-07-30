import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { Server } from "socket.io";
import { addUser, removeUser, getUser } from "./utils/users.js";
import userRoutes from "./routes/user.js";
import roomRoutes from "./routes/room.js";

const app = express();
dotenv.config();


//new code
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';




// // Get the directory of the current module
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// // Use static middleware to serve static files from the client/build directory
// app.use(express.static(join(__dirname, "../client/public")));

// // Handle all other routes by serving the index.html file
// app.get('*', function(req, res) {
//   res.sendFile(join(__dirname, "../client/public/index.html"));
// });




app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use(cors({ origin: process.env.FRONTEND_URL }));

app.use("/users", userRoutes);
app.use("/rooms", roomRoutes);


app.get("/", (req, res) => {
  res.send("Hello to VIA API");
});

const CONNECTION_URL = process.env.CONNECTION_URL;
const PORT = process.env.PORT || 5000;

mongoose
  .connect(CONNECTION_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    const server = app.listen(PORT, () =>
      console.log(`Server running on port: ${PORT}`)
    );
    const io = new Server(server, {
      cookie: false,
      cors: {
        origin: process.env.FRONTEND_URL,
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    io.on("connection", (socket) => {
      socket.on("join", ({ userId, name, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, userId, name, room });

        if (error) return callback(error);

        socket.join(user.room);

        callback();
      });

      socket.on("sendMessage", (message, callback) => {
        const user = getUser(socket.id);

        io.to(user.room).emit("message", {
          senderId: user.userId,
          sender: user.name,
          message: message,
          timestamp: new Date(),
        });

        callback();
      });

      socket.on("typing", () => {
        socket.broadcast.emit("typing");
      });

      socket.on("stop-typing", () => {
        socket.broadcast.emit("stop-typing");
      });

      socket.on("call", () => {
        socket.broadcast.emit("call");
      });

      socket.on("disconnect", () => {
        removeUser(socket.id);
      });
    });
  })
  .catch((error) => console.log(error.message));
