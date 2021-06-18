import mongoose from "mongoose";
import bcrypt from "bcrypt";

const { Schema, model } = mongoose;

const UserSchema = new Schema(
  {
    username: { type: String, required: true },
    profilePic: { type: String },
    about: { type: String },
    status: { type: String, enum: ["Online", "Offline"] },
    lastSeen: { type: Date },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    refreshToken: { type: String },
    googleId: { type: String },
    userRooms: [{ type: Schema.Types.ObjectId, ref: "Room" }],
  },
  {
    timestamps: true,
  }
);

UserSchema.pre("save", async function (next) {
  const user = this;

  const plainPW = user.password;
  if (user.isModified("password")) {
    user.password = await bcrypt.hash(plainPW, 10);
  }
});

UserSchema.methods.toJSON = function () {
  const user = this;

  const userObject = user.toObject();

  delete userObject.password;
  delete userObject.__v;
  delete userObject.refreshToken;
  return userObject;
};

UserSchema.statics.checkCredentials = async function (email, password) {
  const user = await this.findOne({ email });

  if (user) {
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) return user;
    else return null;
  } else return null;
};

export default model("User", UserSchema);
