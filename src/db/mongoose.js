import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connection_URL =
  "mongodb+srv://admin:unWQxSOGQepScNDf@cluster0.3l0gm.mongodb.net/socialMedia";

// console.log(connection_URL);

//function for checking database connection
const connectToMongo = async () => {
  try {
    await mongoose.connect(connection_URL, {
      useNewUrlParser: true,
      autoIndex: true,
      useUnifiedTopology: true,
    });
    console.log("connected to mongo successfully");
  } catch (error) {
    console.log(error);
  }
};

export default connectToMongo;

//unWQxSOGQepScNDf
