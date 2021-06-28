import bcrypt from 'bcrypt';
import UserModel from '../users/schema.js';
import jwt from 'jsonwebtoken';

export const authenticate = async (user) => {
  const newAccessToken = await generateJWT({ _id: user._id });
  const newRefreshToken = await generateRefreshJWT({ _id: user._id });

  user.refreshToken = newRefreshToken;
  await user.save();

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

const generateJWT = (payload) =>
  new Promise((res, rej) =>
    jwt.sign(
      payload,
      process.env.JWTSECRET,
      { expiresIn: '15d' },
      (err, token) => {
        if (err) rej(err);
        res(token);
      }
    )
  );

export const verifyJWT = (payload) =>
  new Promise((res, rej) =>
    jwt.verify(payload, process.env.JWTSECRET, (err, decoded) => {
      if (err) rej(err);
      res(decoded);
    })
  );

const generateRefreshJWT = (payload) =>
  new Promise((res, rej) =>
    jwt.sign(
      payload,
      process.env.REFRESHTOKENSECRET,
      { expiresIn: '1 week' },
      (err, token) => {
        if (err) rej(err);
        res(token);
      }
    )
  );

const verifyRefreshToken = (payload) =>
  new Promise((res, rej) =>
    jwt.verify(payload, process.env.REFRESHTOKENSECRET, (err, decoded) => {
      if (err) rej(err);
      res(token);
    })
  );

export const refreshTokens = async (oldRefreshToken) => {
  const decoded = verifyRefreshToken(oldRefreshToken);

  const user = await UserModel.findOne({ _id: decoded._id });

  if (!user) {
    throw new Error('Access is denied!');
  }

  if (user.refreshToken !== oldRefreshToken) {
    throw new Error('Refresh token is not valid');
  }

  const newAccessToken = await generateJWT({ _id: decoded._id });
  const newRefreshToken = await generateRefreshJWT({ _id: decoded._id });

  user.refreshToken = newRefreshToken;
  await user.save();

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};
