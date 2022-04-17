import User from "../models/users.js";
import jwt from "jsonwebtoken";
const SECRET_KEY = process.env.JWT_SECRET_KEY;

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization"); //giving token to header
    //console.log(token);

    if (!token) {
      res.status(401).send("please authenticate using valid token");
    }
    const data = jwt.verify(token, SECRET_KEY); //verifying token with SECRET_KEY
    //console.log("data: ", data); //data contains _id
    // console.log(data._id);
    const user = await User.findOne({ _id: data._id }); //finding user with that _id
    //req.user = data.user;
    // console.log(user);
    req.user = user; //appending user on req
    //return req.user = user //don't ever return from this function error coming
    next();
  } catch (error) {
    res.status(401).send("please authenticate using valid token");
  }
};

const verifyAdmin = async (req, res, next) => {
  auth(req, res, () => {
    if (req.user.isAdmin) {
      next();
    } else {
      res.status(404).send("You are not allowed to do that");
    }
  });
};

export { auth, verifyAdmin };
