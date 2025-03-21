import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefereshTokens = async (userId) => {
    try {

        const user = await User.findById(userId)

        const accessToken = user.generateAccessToken()

        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken

        await user.save({ validateBeforeSave: false })



        return { accessToken, refreshToken }


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}


const registerUser = asyncHandler(async (req, res) => {
    // get user data from frontend.
    // validation(not empty)
    // check if user already exist or not.via username or email.
    // check for images, check for avatar
    // if available upload them to cloudinary, avatar checking
    // create a user object. - create entry in db.
    // remove password and refresh token field from response.
    // check for user creation 
    // return response


    const { fullname, username, email, password } = req.body;

    // if(fullname === ""){
    //     throw new ApiError(400,"fullname is required.")
    // }

    if (
        [fullname, username, email, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required.");
    }

    // const existedUser = User.findOne({
    //     $or : [{ username } , { email }]
    // })
    // if(existedUser){
    //     throw new ApiError(409,"User with this email or username already exists.")
    // }
    const existedEmail = await User.findOne({ email });
    if (existedEmail) {
        throw new ApiError(409, "This email already exists.");
    }
    const existedUsername = await User.findOne({ username });
    if (existedUsername) {
        throw new ApiError(409, "This username already exists.");
    }

    // now check for avatar and cover images.

    const avatarLocalPath = req.files?.avatar[0]?.path;
    //let coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required.");
    }

    const avatarUpload = await uploadOnCloudinary(avatarLocalPath);
    const coverImageUpload = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatarUpload) {
        throw new ApiError(400, "Avatar is not uploaded to cloudinary");
    } else {
        console.log("avatar has been uploaded to cloudinary successfully.");
    }

    const user = await User.create({
        fullname: fullname,
        username: username.toLowerCase(),
        avatar: avatarUpload.url,
        coverImage: coverImageUpload?.url || "",
        email: email,
        password: password,
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong.");
    } else {
        console.log("user has been created successfully : ", user);
    }
    res.render("home");
    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully.")
    );
});








/////////////////////////////////////////////////// login user ////////////////////









const loginUser = asyncHandler(async (req, res) => {
    // req body --> data
    // username or email 
    // find the user
    // password check
    // access and refresh Token
    // send token in cookies
    // send response.

    const { email, username, password } = req.body;

    if (!username && !email) {
        throw new ApiError(400, "username or email is required.");
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (!user) {
        throw new ApiError(404, "user does not exists.");
    } else {
        console.log("user got founded and proceeding for login ");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "password incorrect.");
    } else {
        console.log("user has entered his password correctly. And proceeding for login");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id);
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    }
    //res.render("home");
    return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(new ApiResponse(200, {
        user: loggedInUser, accessToken, refreshToken
    }, "user logged in successfully."
    ));
});


















// //////////////////////////// logout /////////////////////////


const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request.");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id);
        if (!user) {
            throw new ApiError(401, "Invalid Refresh token.");
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used.");
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefereshTokens(user._id);
        return res.status(200).cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(200, { accessToken, newRefreshToken }, "Accessed token refreshed successfully.")
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token");
    }

});


















/////////////////////////////////////////////////// change current password ////////////////

const changeCurrentPassword = asyncHandler(async (req, res) => {

    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
        throw new ApiError(400, "New password and confirm password do not match");
    }

    const user = await User.findById(req.user._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Please enter correct old password");
    }

    user.password = newPassword || confirmPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(new ApiResponse(200, {}, "password changed successfully."))

});









///////////////////////////////////////////////get current user////////////////////

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(new ApiResponse(200, req.user, "current user fetched successfully"));
})









////////////////////////////////////////////////////// update account details ////////////


const updateAccountDetails = asyncHandler(async (req, res) => {

    const { fullname, email } = req.body;

    if (!fullname || !email) {
        throw new ApiError(400, "All fields are required")
    }
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullname: fullname,
                email: email
            }
        },
        {
            new: true
        }
    ).select("-password");

    return res.status(200).json(new ApiResponse(200, user, "Account details updated successfully"))

});












/////////////////////////////////////////////////////////////// update avatar

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req?.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required.");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar is not upgraded to cloudinary");
    } else {
        console.log("Avatar has been upgraded to cloudinary successfully.");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password");

    if (!user) {
        throw new ApiError(500, "Something went wrong while updating avatar.");
    }

    return res.status(200).json(new ApiResponse(200, user, "Avatar updated successfully."));
});




const updateUserCoverImage = asyncHandler(async (req, res) => {

    const coverImageLocalPath = req?.file?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image is required.");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage) {
        throw new ApiError(400, "Cover image is not upgraded to cloudinary");
    } else {
        console.log("Cover image has been upgraded to cloudinary successfully.");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password");

    if (!user) {
        throw new ApiError(500, "Something went wrong while updating cover image.");
    }

    return res.status(200).json(new ApiResponse(200, user, "Cover image updated successfully."));
});


















/////////////////////////////////////////////////////////// get user channel profile /////////////////////////

const getUserChannelProfile = asyncHandler(async (req, res) => {

    const { username } = req.params;

    if (!username?.trim()) {
        throw new ApiError(400, "username is missing from url parameter.");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscribers",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscriberCount: { $size: "$subscribers" },
                subscribedToCount: { $size: "$subscribedTo" },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id , "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
                subscriberCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1
            }
        }

    ]);

    console.log("channel result: " , channel);
    
    if (!channel?.length) {
        throw new ApiError(404, "Channel not found.");
    }

    return res.status(200).json(new ApiResponse(200, channel[0], "Channel profile fetched successfully."));

});

















/////////////////////////////////////////////////////////// getWatchHistory ////////////

const getWatchHistory = asyncHandler(async(req,res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    res.status(200)
    .json(new ApiResponse(200, user[0].watchHistory, "Watch history fetched successfully."));
})




export {
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
}

