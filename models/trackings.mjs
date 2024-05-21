import { Schema, model } from 'mongoose'

const channel = new Schema({
    id: { type: String, unique: true, required: true },

    twitter: { type: String, default: null },
    discord: { type: String, default: null },
    invite: { type: String, default: null },

    messageHistory: { type: Array, default: [] },
    messagesCount: { type: Number, default: 0 }
});

export const Channel = model("Channel", channel)