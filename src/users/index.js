import { Router } from 'express';
import { jwtAuthMiddleware } from '../auth/index.js';
import { authenticate } from '../auth/tools.js';
import UserModel from './schema.js';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { extname } from 'path';

const router = Router();

const cloudStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: 'Whatsapp Profile' },
});

const cloudMulter = multer({
  storage: cloudStorage,

  fileFilter: function (req, file, next) {
    const acceptedExtensions = ['.png', '.jpg', '.gif', '.bmp', '.jpeg'];
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

router.post('/register', async (req, res, next) => {
  try {
    const newUserObject = new UserModel(req.body);
    const newUserAdded = await newUserObject.save();
    res.status(201).send(newUserAdded._id);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await UserModel.checkCredentials(email, password);
    if (user) {
      const tokens = await authenticate(user);
      //   res.status(200).send(tokens);
      res.cookie('accessToken', tokens.accessToken, {
        sameSite: 'none',
        httpOnly: true,
      });
      res.cookie('refreshToken', tokens.refreshToken, {
        sameSite: 'none',
        httpOnly: true,
      });
      res.status(200).send({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } else {
      res.status(401).send('Error while logging in');
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.get('/me', jwtAuthMiddleware, async (req, res, next) => {
  try {
    res.status(200).send(req.user);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.put(
  '/me',
  jwtAuthMiddleware,
  cloudMulter.single('profilePic'),
  async (req, res, next) => {
    if (req.body) {
      const updates = Object.keys(req.body);
      updates.forEach((update) => (req.user[update] = req.body[update]));
    }

    if (req.file) {
      req.user.profilePic = req.file.path;
    }
    await req.user.save();
    res.status(201).send(req.user);
    try {
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
);

router.delete('/me', jwtAuthMiddleware, async (req, res, next) => {
  try {
    await req.user.deleteOne();
    res.status(204).send();
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.get('/:id', jwtAuthMiddleware, async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.params.id);
    console.log(user.username);
    if (user) {
      //     const userInfo = {
      //        username:user.username,user.profilePic, user.lastSeen, user.about, user.status
      //   };
      res.status(200).send(userInfo);
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

export default router;
