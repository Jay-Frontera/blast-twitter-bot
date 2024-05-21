import { jayBot } from "jay-quick-bot"
import dotenv from 'dotenv'
import connectToMongoose from "connect-to-mongoose"
import { WebSocket } from 'ws'
import { Channel } from "../models/trackings.mjs"
import { millify } from 'millify'
import { RankingMsg } from "../models/ranking.mjs"
import { TwitterUser } from "../models/twitterUser.mjs"
dotenv.config()

await connectToMongoose()

const { TOKEN } = process.env

const client = new jayBot({
    commandsPath: 'src/commands',
    eventsPath: 'src/events',
    token: TOKEN
})

client.userIntents.add([
    "MessageContent",
    "GuildMessages"
])

await client.start()

async function fLoop() {
    const ranks = await RankingMsg.find()

    for (const rank of ranks) {
        const channel = client.channels.cache.get(rank.id) || await client.channels.fetch(rank.id)

        let topGainers = "⭐ Best followers growth 24h\n\n"

        const allStatus = (await TwitterUser.find().lean())
        const alClone = [...allStatus]

        let time = Date.now()
        for (const key in allStatus) {
            const twitterUser = allStatus[key]

            let twentyFour = twitterUser.history.find(e => e.timestamp <= time - (1000 * 60 * 60 * 24)) || twitterUser.history[twitterUser.history.length - 1]

            allStatus[key].percentage = ((twitterUser.followers * 100) / twentyFour.followers) - 100
            allStatus[key].followers -= twentyFour.followers
            allStatus[key].posts -= twentyFour.posts
        }

        allStatus.sort((a, b) => { return b.percentage - a.percentage })

        let i = 1

        for (const twitterUser of allStatus) {
            const name = twitterUser.url.split("/")

            let isPositive = twitterUser.followers >= 0
            let isPositive2 = twitterUser.posts >= 0

            let nextMsg = `${i}・**[@${name[name.length - 1] || name[name.length - 2]}](${twitterUser.url})`

            nextMsg += `・\`${isPositive ? "+" : '-'}${twitterUser.followers}\``

            nextMsg += `・\`+${twitterUser.percentage.toFixed(2)}%\`**\n`

            if (topGainers.length + nextMsg.length < 2000) {
                topGainers += nextMsg
            } else {
                break
            }

            i++
        }

        if (!rank.messagId) {
            const message = await channel.send({ content: topGainers })

            rank.messagId = message.id

            await rank.save()
        } else {
            const msg = await channel.messages.fetch(rank.messagId)

            await msg.edit({ content: topGainers })
        }
    }

    setTimeout(() => { fLoop() }, 5 * 1000 * 60)
}
fLoop()

client.on("messageCreate", async msg => {
    const data = await Channel.findOne({ id: msg.channel.id })

    if (!data) return

    data.messagesCount += 1

    await data.save()
})

function openServer() {
    const server = new WebSocket("ws://localhost:9899")

    server.on("open", () => {
        console.log(`[!] Connected to ws!`)
    })

    server.on("close", () => {
        console.log(`[!] Disconnected from ws`)

        return setTimeout(() => {
            return openServer()
        }, 1500)
    })

    server.on("message", async msg => {
        const data = JSON.parse(Buffer.from(msg, 'utf-8'))
        // console.log(data)

        const {
            followers, discordChannel, posts, twitter, discord, name, message
        } = data

        try {
            const channel = await client.channels.fetch(discordChannel)

            const channelDb = await Channel.findOne({ id: discordChannel })

            let text = `[@${name}](${twitter})・${millify(followers)} Followers・${millify(posts)} Posts\n\n`

            if (channelDb.messageHistory.length == 0) {
                const newMsg = await channel.send({
                    content: text + message
                })

                channelDb.messageHistory.push(newMsg.id)
            }

            const msg = await channel.messages.fetch(channelDb.messageHistory[0])

            await msg.edit({
                content: text + message
            })

            channelDb.markModified("messageHistory")

            await channelDb.save()
        } catch (err) {
            // console.error(err)
        }
    })   
}
openServer()