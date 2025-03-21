// require('dotenv').config({path: "./env"});
import dotenv from "dotenv";

// import mongoose from 'mongoose';
// import { DB_NAME } from "./constants";
import {app} from "./app.js";
import connectDB from "./db/index.js"
dotenv.config({path : "./env"});

console.log(process.env.PORT);
connectDB().then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running on port ${process.env.PORT}`);
    })
}).catch((error) => {
    console.log("app listening failed in src index.js! " + error);
})








/*
import express from "express";
const app = express();

; (async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error", (error) => { console.log(error); })
        app.listen(process.env.PORT, () => {
            console.log("App is listening on port : " + process.env.PORT);
        })
    } catch (error) {
        console.log("Error while connecting dbs: " + error);
        throw error
    }
})()

*/