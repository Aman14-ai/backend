import {v2 as cloudinary} from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) =>{
    try {
        console.log(localFilePath);
        if(!localFilePath){ return null; }
        //upload the file on clodu
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type:"auto",
        })
        // file has been uploaded successfully

        //console.log("file is successfully uploaded on cloudinary" + response.url);
        fs.unlinkSync(localFilePath);
        return response;

    } catch (error) {
        
        fs.unlinkSync(localFilePath); // remove the locallysaved file from the server
        return null;
    }
}

export {uploadOnCloudinary}