import { Router } from "express";
import { upload } from "../middlewares/multer.middlewares.js";
import 
{
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
} from "../controllers/user.controllers.js";

import fs from "fs";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

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

router.route("/login").post(loginUser).get((req, res) => {
    res.render("login");
})

// secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/current-user").get(verifyJWT,getCurrentUser);
router.route("/update-account").patch(verifyJWT,updateAccountDetails);
router.route("/update-avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar);
router.route("/update-cover-image").patch(verifyJWT,upload.single("coverImage"),updateUserCoverImage);
router.route("/channel/:username").get(verifyJWT,getUserChannelProfile);
router.route("/history").get(verifyJWT,getWatchHistory);
// till now everything is working properly.


router.route("/signup").get((req, res) => {
    res.render('signup');
});


export default router;