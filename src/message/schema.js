import mongoose from "mongoose";

const { Schema, model } = mongoose;

export const MessageSchema = new Schema({
  senderId: { type: Schema.Types.ObjectId, ref: "User" },
  text: { type: String },
  messagePic: { type: String },
  createdAt: { type: Date },
  updatedAt: { type: Date, required: true },
});

export default model("Message", MessageSchema);
