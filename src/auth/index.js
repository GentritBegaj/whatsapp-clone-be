import { verifyJWT } from "./tools.js";
import UserModel from "../users/schema.js";

export const jwtAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken;
    const decoded = await verifyJWT(token);

    const user = await UserModel.findOne({ _id: decoded._id }).populate({
      path: "userRooms",
      populate: {
        path: "members",
        select: ["username", "profilePic", "lastSeen"],
      },
    });
    if (!user) {
      throw new Error();
    }
    req.user = user;
    next();
  } catch (error) {
    console.log(error);
    next(error);
  }
};
