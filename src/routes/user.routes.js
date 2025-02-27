import { Router } from "express";
import {upload} from "../middlewares/multer.middlewares.js";
import { registerUser } from "../controllers/user.controllers.js"
import fs from "fs";

const uploadDir = "public/temp";

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
const router = Router()

router.route("/register").post((req, res, next) => {
    upload.fields([
        { name: "avatar", maxCount: 1 },
        { name: "coverImage", maxCount: 1 }
    ])(req, res, function (err) {
        if (err) {
            console.error("Multer error:", err);
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, registerUser);


export default router;