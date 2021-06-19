import { Router } from "express";
import { jwtAuthMiddleware } from "../auth/index.js";
import RoomModel from "./schema.js";
import UserModel from "../users/schema.js";
import MessageModel from "../message/schema.js";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { extname } from "path";

const router = Router();

const cloudStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: "Whatsapp messages" },
});

const cloudMulter = multer({
  storage: cloudStorage,

  fileFilter: function (req, file, next) {
    const acceptedExtensions = [".png", ".jpg", ".gif", ".bmp", ".jpeg"];
    if (!acceptedExtensions.includes(extname(file.originalname))) {
      return next(
        new ErrorResponse(
          `Image type not allowed: ${extname(file.originalname)}`
        )
      );
    }
    next(null, true);
  },
});

router.get("/", jwtAuthMiddleware, async (req, res, next) => {
  try {
    const rooms = await RoomModel.find({
      members: { $in: [req.user._id] },
    }).populate("members");
    res.status(200).send(rooms);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.get("/:roomId", jwtAuthMiddleware, async (req, res, next) => {
  try {
    const room = await RoomModel.findOne({ _id: req.params.roomId }).populate([
      { path: "members" },
      { path: "messages", populate: { path: "messages._id" } },
    ]);
    if (room) {
      res.status(200).send(room);
    } else {
      const error = new Error(`A user can only fetch rooms he is a part of`);
      error.httpStatusCode = 401;
      next(error);
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.post("/", jwtAuthMiddleware, async (req, res, next) => {
  try {
    const newRoomObject = new RoomModel({
      members: [req.user._id, req.body.receiverId],
    });
    const newRoom = await newRoomObject.save();
    newRoom.members.forEach(async (member) => {
      await UserModel.findByIdAndUpdate(
        { _id: member },
        {
          $push: {
            userRooms: newRoom._id,
          },
        },
        {
          runValidators: true,
          new: true,
        }
      );
    });

    res.status(201).send(newRoom);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.post("/groupChat", jwtAuthMiddleware, async (req, res, next) => {
  try {
    const newRoomObject = new RoomModel({
      members: [req.user._id, ...req.body.receiverIds],
    });
    const newRoom = await newRoomObject.save();
    newRoom.members.forEach(async (member) => {
      await UserModel.findByIdAndUpdate(
        { _id: member },
        {
          $push: {
            userRooms: newRoom._id,
          },
        },
        {
          runValidators: true,
          new: true,
        }
      );
    });
    res.status(201).send(newRoom);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.delete("/:roomId", jwtAuthMiddleware, async (req, res, next) => {
  try {
    const roomToDelete = await RoomModel.findByIdAndDelete(req.params.roomId);
    if (roomToDelete) {
      res.status(204).send("Deleted Room");
    } else {
      const error = new Error(`Room not found`);
      error.httpStatusCode = 404;
      next(error);
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

// ****************************Messages*************************

router.post(
  "/:roomId",
  jwtAuthMiddleware,
  cloudMulter.single("messagePic"),
  async (req, res, next) => {
    try {
      const newMessage = new MessageModel({
        senderId: req.user._id,
        text: req.body.text,
        messagePic: req.file?.path ? req.file.path : "",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const message = { ...newMessage.toObject() };
      const room = await RoomModel.findByIdAndUpdate(
        req.params.roomId,
        {
          $push: {
            messages: { ...message },
          },
        },
        {
          runValidators: true,
          new: true,
        }
      );
      res.status(200).send(room);
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
);

router.put("/:roomId/:messageId", jwtAuthMiddleware, async (req, res, next) => {
  try {
    const modifiedRoom = await RoomModel.findOneAndUpdate(
      {
        _id: req.params.roomId,
        "messages._id": req.params.messageId,
      },
      {
        $set: {
          "messages.$": {
            senderId: req.user._id,
            ...req.body,
            _id: req.params.messageId,
            updatedAt: new Date(),
          },
        },
      },
      {
        runValidators: true,
        new: true,
      }
    );
    if (modifiedRoom) {
      res.status(201).send(modifiedRoom);
    } else {
      const error = new Error(`Room not found`);
      error.httpStatusCode = 404;
      next(error);
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.delete(
  "/:roomId/:messageId",
  jwtAuthMiddleware,
  async (req, res, next) => {
    try {
      const modifiedRoom = await RoomModel.findByIdAndUpdate(
        {
          _id: req.params.roomId,
        },
        {
          $pull: {
            messages: { _id: req.params.messageId },
          },
        },
        {
          new: true,
        }
      );
      if (modifiedRoom) {
        res.status(204).send(modifiedRoom);
      } else {
        const error = new Error(`Room not found`);
        error.httpStatusCode = 404;
        next(error);
      }
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
);

export default router;
