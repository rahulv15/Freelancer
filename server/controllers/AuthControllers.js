import { Prisma, PrismaClient } from "@prisma/client";
import { compare, genSalt, hash } from "bcrypt";
import jwt from "jsonwebtoken";
import { renameSync } from "fs"
import { userInfo } from "os";

const generatePassword = async (password) => {
    const salt = await genSalt();
    return await hash(password, salt);
};
const maxAge = 3*24*60*60;

const createToken = (email, userId) => {
    return jwt.sign({email, userId}, process.env.JWT_KEY,{
        expiresIn: maxAge,
    });
};




//Signup
export const signUp = async (req, res, next) => {

    try{
    const prisma = new PrismaClient();
    const { email, password } = req.body;
    if (email && password) {
      const user = await prisma.user.create({
        data: {
          email,
          password: await generatePassword(password),
        },
      });
      return res
      // .cookie("jwt", createToken(email, user.id),{
      //   httpOnly: false,
      //   maxAge: maxAge * 1000,
      // })
      .status(201).json({
        user: { id: user?.id, email: user?.email},
        jwt: createToken(email, user.id),
      });
    } else {
    return res.status(400).send("Email and Password Required");
    };
    } catch (error) {
        console.error('Error signing up:', error);
        // Ensure that the error is logged properly
        // Also, return a meaningful error response to the client
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

//Login
export const login = async (req, res, next) => {

    try{
    const prisma = new PrismaClient();
    const { email, password } = req.body;
    if (email && password) {
      const user = await prisma.user.findUnique({
        where: { email },
      });
      if (!user) {
        return res.status(404).send("User Not Found.")
      }
      const auth = await compare(password, user.password);

      if (!auth) {
        return res.status(400).send("Invalid Password");
      }
      return res
      // .cookie("jwt", createToken(email, user.id), {
      //   httpOnly: false,
      //   maxAge: maxAge * 1000,
      // })
      .status(201)
      .json({
        user: { id: user?.id, email: user?.email },
        jwt: createToken(email, user?.id),
      }
      
    );
    } else {
    return res.status(400).send("Email and Password Required");
    };
    } catch (error) {
        console.error('Error signing up:', error);
        // Ensure that the error is logged properly
        // Also, return a meaningful error response to the client
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getUserInfo = async (req, res, next)  => {
  try {
    if (req?.userId) {
      const prisma = new PrismaClient();
      const user = await prisma.user.findUnique({
        where: {
          id: req.userId,
        },
      });
      delete user.password
      return res.status(200).json({ user });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send("Internal Server Error")
  }
};

export const setUserInfo = async (req, res, next)  => {
  try {
    if (req?.userId) {
      const {userName, fullName, description} = req.body ;
      if (userName && fullName && description){
        const prisma = new PrismaClient();
        const userNameValid = await prisma.user.findUnique({
          where: { username : userName },
        });
        if (userNameValid) {
          return res.status(200).json({ userNameError: true});
        }
        await prisma.user.update({
          where: { id: req.userId },
          data: {
            username: userName,
            fullName,
            description,
            isProfileInfoSet: true,
          },
        });
        return res.status(200).send("Profile data updated successfully.");
      }
    }else{
      return res.status(400).send("Username, Fullname and description should be included.");
    }
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError){
      if (err.code === "P2002"){
        return res.status(400).json({ userNameError: true });
      }
    } else {
      return res.status(500).send("Internal Server Error");
    }
    throw err;
  }
};


export const setUserImage = async (req, res, next)  => {
  try {
    if (req.file) {
      if (req.userId) {
       console.log(req.file);
        const date = Date.now;
        let fileName = "uploads/profiles/" + date + req.file.originalname;
        renameSync (req.file.path, fileName);
        const prisma = new PrismaClient();
        await prisma.user.update({
          where: {id:req.userId},
          data: { profileImage: fileName},
        });
        return res.status(200).json({img: fileName });
      }
      return res.status(400).json("Cookie Error.");
    }
    return res.status(400).json("Image Not Included.");
  } catch (err) {
    console.log(err);
    return res.status(500).send("Internal Server Error");
  }
};
