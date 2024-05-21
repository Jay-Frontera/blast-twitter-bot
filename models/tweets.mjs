import { Schema, model } from 'mongoose'

const tweets = new Schema({
    url: { type: String, unique: true, required: true },
    id: { type: String },
    type: { type: String },
    text: { type: String },
    interactions: {
        likes: { type: Number },
        retweets: { type: Number },
        bookmark: { type: Number },
        quote: { type: Number },
        reply: { type: Number },
        views: { type: Number }
    },
    media: { type: [String] }
});

export const Tweets = model("Tweets", tweets)