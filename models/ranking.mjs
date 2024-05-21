import { Schema, model } from 'mongoose'

const rankingMsg = new Schema({
    id: { type: String, required: true },
    messagId: { type: String, default: null }
});

export const RankingMsg = model("RankingMsg", rankingMsg)