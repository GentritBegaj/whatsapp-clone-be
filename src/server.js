import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import {
  notFoundErrorHandler,
  badRequestErrorHandler,
  forbiddenErrorHandler,
  catchAllErrorHandler,
  unauthorizedErrorHandler,
} from './errorHandlers.js';
import mongoose from 'mongoose';
import usersRoutes from './users/index.js';
import roomsRoutes from './room/index.js';
import cookieParser from 'cookie-parser';
import UserModel from './users/schema.js';

const port = process.env.PORT || 3001;

const app = express();
const server = createServer(app);
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
const io = new Server(server, {
  allowEIO3: true,
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET, POST, PUT, DELETE'],
  },
});

app.use(express.json());
app.use(cookieParser());

app.use('/users', usersRoutes);
app.use('/rooms', roomsRoutes);

let activeSockets = [];

io.on('connection', (socket) => {
  console.log(`User with socket ID ${socket.id} just connected`);

  socket.on('isOnline', ({ userID }) => {
    // console.log(userID);
    activeSockets = activeSockets.filter((u) => u.userId !== userID);
    activeSockets.push({ userId: userID, socketId: socket.id });

    io.sockets.emit('getUsers', activeSockets);
    // console.log(activeSockets);
  });

  socket.on('sendMessage', (message) => {
    // console.log(message);
    const receiverIds = message.receiverId.map((u) => u._id);
    receiverIds.forEach((user) => {
      const userIntended = activeSockets
        .filter((u) => u.userId === user)
        .find((i) => i.userId === user);
      if (!userIntended) return null;

      socket.to(userIntended.socketId).emit('newMessage', message);
    });
  });

  socket.on('disconnect', async () => {
    console.log(`${socket.id} disconnected`);
    const user = activeSockets.find((u) => u.socketId === socket.id);
    const userDB = await UserModel.findById(user.userId);
    userDB.lastSeen = new Date();
    await userDB.save();
    let lastSeenTime = new Date();
    let userLastSeenId = user.userId;
    activeSockets = activeSockets
      .filter((user) => user.socketId !== socket.id)
      .filter((u) => u.userId !== undefined);
    console.log(activeSockets);
    io.sockets.emit('getUsers', activeSockets);
    io.sockets.emit('lastSeen', { lastSeenTime, userLastSeenId });
  });
});

app.use(badRequestErrorHandler);
app.use(notFoundErrorHandler);
app.use(forbiddenErrorHandler);
app.use(unauthorizedErrorHandler);
app.use(catchAllErrorHandler);

mongoose
  .connect(process.env.MONGOCONNECTION, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  })
  .then(
    server.listen(port, () => console.log(`Server is running on port ${port}`))
  )
  .catch((err) => console.log(err));
