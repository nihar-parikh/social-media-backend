import express from "express";
import { body, validationResult } from "express-validator"; //see docs.
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/users.js";
import { auth, verifyAdmin } from "../middleware/auth.js";

const router = express.Router();

const SECRET_KEY = process.env.JWT_SECRET_KEY;
//console.log(SECRET_KEY);

//signup route
router.post(
  "/signup",
  [
    body("name").isLength({ min: 3 }),
    body("email", "enter valid email").isEmail(),
    body("password", "password must be atleast 5 characters").isLength({
      min: 5,
    }),
  ], //second parameters are for validation
  async (req, res) => {
    try {
      const errors = validationResult(req); //checking for error
      if (errors.isEmpty()) {
        const existedUser = await User.findOne({ email: req.body.email });
        if (existedUser) {
          return res.status(400).send("email already in use");
        }

        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(req.body.password, salt);
        const user = await User.create({
          name: req.body.name,
          email: req.body.email,
          password: hashedPassword,
        });
        const token = jwt.sign({ _id: user._id }, SECRET_KEY);
        //return res.status(200).send(user);
        const { password, ...otherInfo } = user._doc; //user._doc contains user info

        return res.status(200).send({ ...otherInfo, token: token });
      } else {
        return res.status(400).send(errors);
      }
    } catch (error) {
      res.status(400).send(error);
    }
  }
);

//login route
router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    //console.log(user);
    if (!user) {
      return res.status(404).send({ error: "invalid credentials" });
    }
    const matchedPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );
    //console.log(matchedPassword);
    if (!matchedPassword) {
      return res.status(404).send({ error: "invalid credentials" });
    }
    const token = jwt.sign({ _id: user._id }, SECRET_KEY);

    // const { password, ...otherInfo } = user; //it contains all other info
    const { password, ...otherInfo } = user._doc; //user._doc contains user info

    return res.status(200).send({ ...otherInfo, token: token });
  } catch (error) {
    res.status(500).send(error);
  }
});

//get friends
router.get("/friends/:userId", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    const friends = await Promise.all(
      user.followings.map((following) => {
        return User.findById(following._id);
      })
    );
    let friendList = [];
    friends.map((friend) => {
      const { _id, name } = friend;
      friendList.push({ _id, name });
    });
    res.status(200).json(friendList);
  } catch (err) {
    res.status(500).json(err);
  }
});

//get suggestions
router.get("/suggestions/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    const suggestions = await Promise.all(
      user.followings.map((following) => {
        return User.find({ _id: { $ne: following._id } });
      })
    );
    let suggestionList = [];
    suggestions[0].map((friend) => {
      const { _id, name } = friend;
      suggestionList.push({ _id, name });
    });
    res.status(200).json(suggestionList);
  } catch (err) {
    res.status(500).json(err);
  }
});

//get others-friends
router.get("/others-friends/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    const friends = await Promise.all(
      user.followings.map((following) => {
        return User.findById(following._id);
      })
    );
    let friendList = [];
    friends.map((friend) => {
      const { _id, name } = friend;
      friendList.push({ _id, name });
    });
    res.status(200).json(friendList);
  } catch (err) {
    res.status(500).json(err);
  }
});

//get all requests
router.get("/requests/:userId", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    const requests = await Promise.all(
      user.requests.map((request) => {
        return User.findById(request._id);
      })
    );
    let requestList = [];
    requests.map((request) => {
      const { _id, name } = request;
      requestList.push({ _id, name });
    });
    res.status(200).json(requestList);
  } catch (err) {
    res.status(500).json(err);
  }
});

//sending request to user
router.post("/:id/request", auth, async (req, res) => {
  if (req.body.userId !== req.params.id) {
    try {
      const user = await User.findById(req.params.id);
      const currentUser = await User.findById(req.body.userId);

      if (!user.followers.includes(req.body.userId)) {
        await currentUser.updateOne({
          $push: {
            requests: {
              $each: [{ _id: user._id, name: user.name }],
            },
          },
        });
        res.status(200).json("your request has been sent");
      } else {
        res.status(403).json("you allready sent a request to this user");
      }
    } catch (err) {
      res.status(500).json(err);
    }
  } else {
    res.status(403).json("you can't send request to yourself");
  }
});

//accept a request

router.put("/:id/accept", auth, async (req, res) => {
  if (req.body.userId !== req.params.id) {
    try {
      const user = await User.findById(req.params.id);
      const currentUser = await User.findById(req.body.userId);
      if (!user.followers.includes(req.body.userId)) {
        await user.updateOne({
          $push: {
            followers: {
              $each: [{ _id: currentUser._id, name: currentUser.name }],
            },
          },
        });
        await user.updateOne({
          $pull: {
            requests: { _id: currentUser._id, name: currentUser.name },
          },
        });
        await currentUser.updateOne({
          $push: {
            followings: {
              $each: [{ _id: user._id, name: user.name }],
            },
          },
        });

        res
          .status(200)
          .json({ message: "request accepted", requests: user.requests });
      } else {
        res.status(403).json("you allready follow this user");
      }
    } catch (err) {
      res.status(500).json(err);
    }
  } else {
    res.status(403).json("you cant follow yourself");
  }
});

//decline a request

router.put("/:id/decline", auth, async (req, res) => {
  if (req.body.userId !== req.params.id) {
    try {
      const user = await User.findById(req.params.id);
      const currentUser = await User.findById(req.body.userId);
      await user.updateOne({
        $pull: {
          requests: { _id: currentUser._id, name: currentUser.name },
        },
      });

      res
        .status(200)
        .json({ message: "request declined!!!", requests: user.requests });
      //   } else {
      //     res.status(403).json("you dont follow this user");
      //   }
    } catch (err) {
      res.status(500).json(err);
    }
  } else {
    res.status(403).json("you cant decline yourself");
  }
});

//unfollow a user

router.put("/:id/unfollow", auth, async (req, res) => {
  if (req.body.userId !== req.params.id) {
    try {
      const user = await User.findById(req.params.id);
      const currentUser = await User.findById(req.body.userId);
      if (user.followers.includes(req.body.userId)) {
        await user.updateOne({ $pull: { followers: req.body.userId } });
        await currentUser.updateOne({ $pull: { followings: req.params.id } });
        res.status(200).json("user has been unfollowed");
      } else {
        res.status(403).json("you dont follow this user");
      }
    } catch (err) {
      res.status(500).json(err);
    }
  } else {
    res.status(403).json("you cant unfollow yourself");
  }
});

export default router;
