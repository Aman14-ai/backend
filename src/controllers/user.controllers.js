import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefereshTokens = async(userId) =>{
    try {
        
        const user = await User.findById(userId)

        const accessToken = user.generateAccessToken()
        
        const refreshToken = user.generateRefreshToken()
        
        user.refreshToken = refreshToken
        
        await user.save({ validateBeforeSave: false })
        
       

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}


const registerUser = asyncHandler(async (req,res) => {
    // get user data from frontend.
    // validation(not empty)
    // check if user already exist or not.via username or email.
    // check for images, check for avatar
    // if available upload them to cloudinary, avatar checking
    // create a user object. - create entry in db.
    // remove password and refresh token field from response.
    // check for user creation 
    // return response


    const { fullname , username, email , password } = req.body;
      
    // if(fullname === ""){
    //     throw new ApiError(400,"fullname is required.")
    // }
    
    if (
        [fullname , username, email,password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required.");
    }

    // const existedUser = User.findOne({
    //     $or : [{ username } , { email }]
    // })
    // if(existedUser){
    //     throw new ApiError(409,"User with this email or username already exists.")
    // }
    const existedEmail = await User.findOne({email});
    if (existedEmail) {
        throw new ApiError(409,"This email already exists.");
    }
    const existedUsername = await User.findOne({username});
    if (existedUsername) {
        throw new ApiError(409, "This username already exists.");
    }

    // now check for avatar and cover images.
    
    const avatarLocalPath = req.files?.avatar[0]?.path;
    //let coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is required.");
    }
    
    const avatarUpload = await uploadOnCloudinary(avatarLocalPath);
    const coverImageUpload = await uploadOnCloudinary(coverImageLocalPath);
    
    if(!avatarUpload){
        throw new ApiError(400, "Avatar is not uploaded to cloudinary");
    }else{
        console.log("avatar has been uploaded to cloudinary successfully.");
    }

    const user = await User.create({
        fullname: fullname,
        username: username.toLowerCase(),
        avatar: avatarUpload.url,
        coverImage: coverImageUpload?.url||"",
        email:email,
        password:password,
    })
    
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );
    if (!createdUser) {
        throw new ApiError(500 , "Something went wrong.");
    }else{
        console.log("user has been created successfully : " , user);
    }
    res.render("home");
    return res.status(201).json(
        new ApiResponse(201,createdUser,"User registered successfully.")
    );
});








/////////////////////////////////////////////////// login user ////////////////////









const loginUser = asyncHandler(async (req,res) => {
    // req body --> data
    // username or email 
    // find the user
    // password check
    // access and refresh Token
    // send token in cookies
    // send response.

    const { email , username , password } = req.body;

    if(!username && !email){
        throw new ApiError(400, "username or email is required.");
    }

    const user = await User.findOne({
        $or : [{username} , {email}]
    });

    if (!user) {
        throw new ApiError(404, "user does not exists.");
    }else{
        console.log("user got founded and proceeding for login ");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401 , "password incorrect.");
    }else{
        console.log("user has entered his password correctly. And proceeding for login");
    }

    const { accessToken , refreshToken } = await generateAccessAndRefereshTokens(user._id);
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    }
    res.render("home");
    return res.status(200).cookie("accessToken" , accessToken, options).cookie("refreshToken" , refreshToken, options).json(new ApiResponse(200,{
        user: loggedInUser, accessToken , refreshToken  
    },"user logged in successfully."
));
});


















// //////////////////////////// logout /////////////////////////


const logoutUser = asyncHandler(async(req, res) => {
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

const refreshAccessToken = asyncHandler(async(req,res)=> {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request.");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user  = await User.findById(decodedToken?._id);
        if(!user){
            throw new ApiError(401,"Invalid Refresh token.");
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired or used.");
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const { accessToken , newRefreshToken } = await generateAccessAndRefereshTokens(user._id);
        return res.status(200).cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(200, {accessToken , newRefreshToken }, "Accessed token refreshed successfully.")
        );
    } catch (error) {
        throw new ApiError(401, error?.message||"Invalid access token");
    }

})




export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
}

