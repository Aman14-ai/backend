import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json({ limit:"16kb" }));
app.use(express.urlencoded({ extended:true , limit:"16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

app.set("view engine", 'ejs');
app.set('views', path.resolve('./views'));

// routes
import userRouter from "./routes/user.routes.js"
app.use('/api/v1/users',userRouter);




export { app }