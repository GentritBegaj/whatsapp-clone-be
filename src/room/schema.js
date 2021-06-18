import mongoose from "mongoose";
import { MessageSchema } from "../message/schema.js";

const { Schema, model } = mongoose;

const RoomSchema = new Schema(
  {
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
    messages: [MessageSchema],
  },
  {
    timestamps: true,
  }
);

export default model("Room", RoomSchema);
