import { Schema, model } from 'mongoose'

const twitterUser = new Schema({
    url: { type: String, unique: true, required: true },

    history: { type: Array, default: [] },

    followers: { type: Number, default: 0 },
    posts: { type: Number, default: 0 },
    icon: { type: String, default: null }
});

export const TwitterUser = model("TwitterUser", twitterUser)