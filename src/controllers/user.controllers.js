import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../util/ApiResponse.js";

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
    const existedEmail = User.findOne({email});
    if (existedEmail) {
        throw new ApiError(409,"This email already exists.");
    }
    const existedUsername =User.findOne({username});
    if (existedUsername) {
        throw new ApiError(409, "This username already exists.");
    }

    // now check for avatar and cover images.
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

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
    return res.status(200).json(
        new ApiResponse(201,createdUser,"User registered successfully.")
    );
});


export {
    registerUser
}

