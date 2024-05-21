import { WebSocketServer } from 'ws'
import axios from 'axios'
import dotenv from 'dotenv'
import scrapeLinks from '../lib/browser.mjs'
import connectToMongoose from 'connect-to-mongoose'
import { Channel } from '../models/trackings.mjs'
import { TwitterUser } from '../models/twitterUser.mjs'
import { millify } from 'millify'
import { Tweets } from '../models/tweets.mjs'
dotenv.config()
await connectToMongoose()

const { COOKIE, BEARER } = process.env

const headers = {
    Cookie: COOKIE
}

const server = new WebSocketServer({
    port: 9899
})

async function updateTwitter() {
    const channels = await Channel.find()

    let fetchGroups = []
    let currentGroup = []

    for (const channel of channels) {
        if (currentGroup.length == 7) {
            fetchGroups.push(currentGroup)
            currentGroup = []
        }
        if (channel.twitter) {
            currentGroup.push(
                async function fetchData() {
                    return new Promise(async (res, rej) => {
                        try {
                            const time = Date.now()

                            const { data, url } = await scrapeLinks({
                                url: channel.twitter,
                                searchQuery: "userbyscreenname",
                                headers
                            })

                            const {
                                followers_count,
                                statuses_count,
                                screen_name,
                                profile_image_url_https
                            } = data.data.user.result.legacy

                            const twitterUser = await TwitterUser.findOne({ url: channel.twitter }) || new TwitterUser({ url: channel.twitter })

                            twitterUser.followers = followers_count
                            twitterUser.posts = statuses_count
                            twitterUser.icon = profile_image_url_https

                            twitterUser.history.unshift({
                                followers: followers_count,
                                posts: statuses_count,
                                timestamp: time
                            })

                            twitterUser.markModified("history")

                            let analytics = ""

                            let oneHourData = twitterUser.history.find(e => e.timestamp <= time - (1000 * 60 * 60)) || twitterUser.history[twitterUser.history.length - 1]
                            let sixHoursData = twitterUser.history.find(e => e.timestamp <= time - (1000 * 60 * 60 * 6)) || twitterUser.history[twitterUser.history.length - 1]
                            let twelveHoursData = twitterUser.history.find(e => e.timestamp <= time - (1000 * 60 * 60 * 12)) || twitterUser.history[twitterUser.history.length - 1]
                            let twentyFour = twitterUser.history.find(e => e.timestamp <= time - (1000 * 60 * 60 * 24)) || twitterUser.history[twitterUser.history.length - 1]

                            const items = [{ ...oneHourData, time: 1 }, { ...sixHoursData, time: 6 }, { ...twelveHoursData, time: 12 }, { ...twentyFour, time: 24 }]

                            for (const {
                                followers,
                                time
                            } of items) {
                                if (followers == twitterUser.followers) {
                                    analytics += `~~No new followers last ${time}h~~\n`
                                } else if (followers < twitterUser.followers) {
                                    analytics += `Followers change ${time}h **\`+${(((twitterUser.followers * 100) / followers) - 100).toFixed(2)}%\`**・**\`+${twitterUser.followers - followers}\`**\n`
                                } else {
                                    analytics += `Followers change ${time}h **\`-${(100 - ((twitterUser.followers * 100) / followers)).toFixed(2)}%\`**・**\`${twitterUser.followers - followers}\`**\n`
                                }
                            }

                            analytics += "\n"

                            for (const {
                                posts,
                                time
                            } of items) {
                                if (posts == twitterUser.posts) {
                                    analytics += `~~No new posts last ${time}h~~\n`
                                } else if (posts < twitterUser.posts) {
                                    analytics += `Posts ${time}h +${twitterUser.posts - posts}\n`
                                } else {
                                    analytics += `Posts ${time}h ${twitterUser.posts - posts}\n`
                                }
                            }

                            await twitterUser.save()

                            server.clients.forEach(client => {
                                client.send(Buffer.from(JSON.stringify({
                                    followers: followers_count,
                                    discordChannel: channel.id,
                                    posts: statuses_count,
                                    twitter: channel.twitter,
                                    discord: channel.discord,
                                    name: screen_name,
                                    message: analytics
                                }), 'utf-8'))
                            })
                        } catch (err) {
                        }

                        try {
                            const data = await scrapeLinks({
                                url: channel.twitter,
                                searchQuery: "UserTweets?",
                                headers: {
                                    Authorization: "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
                                    Cookie: `kdt=kjrrovrlH0S7QzAkuEMglxGUhu4yqv1Iq0wN9sio; co=us; dnt=1; ads_prefs="HBISAAA="; auth_multi="1744415571221839872:a235fc134b77b239f66662dd7f9e8e94416d4dc1|1701300834439442432:64352262ec46fd0482311f08f34fc7207539a93d|1505741451220688904:ae426618b166cc3a5136b94b9e364cf4bbe7543c"; auth_token=bef8434ec6ce03bc3d2274b67cc4ffb494168bfe; guest_id_ads=v1%3A170913875786307073; guest_id_marketing=v1%3A170913875786307073; guest_id=v1%3A170913875786307073; twid=u%3D1664696648985989135; ct0=6a50fa86085fd86c14c8173ca9143937bec5bdb6ab83d5e27a27809b37e48ccf57e31989cb9afd7d91fe200ccb78b4b15fce4820154dedd40e7721d7574509ea96727ed4e397da9ed2e7cacfbb4b921c; d_prefs=MjoxLGNvbnNlbnRfdmVyc2lvbjoyLHRleHRfdmVyc2lvbjoxMDAw; lang=en; external_referer=padhuUp37zjSzNXpb3CVCQ%3D%3D|0|8e8t2xd8A2w%3D; personalization_id="v1_YbC42riL3zvJNmRcBt8I+Q=="`,
                                    Origin: "https://twitter.com",
                                    "X-Twitter-Active-User": "yes",
                                    "X-Twitter-Client-Language": "en",
                                    "X-Twitter-Csrf-Token": "6a50fa86085fd86c14c8173ca9143937bec5bdb6ab83d5e27a27809b37e48ccf57e31989cb9afd7d91fe200ccb78b4b15fce4820154dedd40e7721d7574509ea96727ed4e397da9ed2e7cacfbb4b921c",
                                    "X-Client-Transaction-Id": "s6yVMOlCliHm++nzz9ETirFVGf6B1eE6P1WDooEtYK4TkMj/8bFQyX02d6JqDQuQfF/RK7Ijo/XjuD/t6uv9uMbEDQiZsg",
                                    "X-Twitter-Auth-Type": "OAuth2Session"
                                }
                            })

                            const timelineItems = data.data.data.user.result.timeline_v2.timeline.instructions

                            const tweets = timelineItems.filter(
                                item => item.type == "TimelineAddEntries"
                            )[0].entries.map(
                                item => {
                                    return item.entryId?.includes("tweet-") ? item.content.itemContent.tweet_results.result : null
                                }
                            ).filter(
                                e => e != null
                            ).map(e => {
                                return {
                                    id: e.rest_id,
                                    type: e.__typename,
                                    text: e.legacy.full_text,
                                    interactions: {
                                        likes: e.legacy.favorite_count,
                                        retweets: e.legacy.retweet_count,
                                        bookmark: e.legacy.bookmark_count,
                                        quote: e.legacy.quote_count,
                                        reply: e.legacy.reply_count,
                                        views: Number(e.views.count)
                                    },
                                    media: e.legacy.entities?.media?.map(m => {
                                        return m.display_url
                                    }),
                                }
                            })

                            for (const tweeted of tweets) {
                                const {
                                    id,
                                    type,
                                    text,
                                    interactions,
                                    media
                                } = tweeted

                                const tweet = await Tweets.findOne({ id }) || new Tweets({ id })

                                tweet.url = channel.twitter
                                tweet.type = type
                                tweet.text = text
                                tweet.interactions = interactions
                                tweet.media = media

                                tweet.markModified("media")

                                await tweet.save()
                            }
                            res()
                        } catch (err) {
                            res()
                            console.error(err)
                        }
                    })
                }
            )
        }
    }
    fetchGroups.push(currentGroup)

    function fetchMany() {
        if (fetchGroups.length == 0) {
            console.log(`Process finalized.`)

            return setTimeout(() => {
                return updateTwitter()
            }, 60 * 1000 * 30)
        }

        const group = fetchGroups.splice(0, 1)[0]

        console.log(`Fetching ${group.length} accounts`)

        let ok = []

        group.forEach(async item => {
            await item()

            ok.push("ok")

            if (ok.length == group.length) {
                fetchMany()
            }
        })
    }
    fetchMany()
}
updateTwitter()

server.on("connection", ws => {
    console.log(`[!] New connection`)
})