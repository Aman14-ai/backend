import mongoose , { Schema , model } from "mongoose";

const subscriptionSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    channer: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
} , { timestamps: true });

export const Subscription = model("Subscription", subscriptionSchema);