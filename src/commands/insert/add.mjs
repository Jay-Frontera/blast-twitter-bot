import { SlashCommandBuilder } from 'discord.js'
import { Channel } from '../../../models/trackings.mjs'
import { TwitterUser } from '../../../models/twitterUser.mjs'
import { RankingMsg } from '../../../models/ranking.mjs'

export const data = new SlashCommandBuilder()
    .setName('add')
    .setDescription('Adds a item for tracking')
    .addSubcommand(sub =>
        sub
            .setName("twitter")
            .setDescription("Adds a twitter url for being tracked in the current channel")
            .addStringOption(option =>
                option
                    .setName("url")
                    .setRequired(true)
                    .setDescription("page link")
            )
    )
    .addSubcommand(sub =>
        sub
            .setName("discord")
            .setDescription("Adds a discord chat for tracking news")
            .addStringOption(option =>
                option
                    .setName("channel_id")
                    .setRequired(true)
                    .setDescription("news channel id")
            )
            .addStringOption(option =>
                option
                    .setName("invite")
                    .setRequired(true)
                    .setDescription("invite link (permanent please)")
            )
    )
    .addSubcommand(sub =>
        sub
            .setName("ranking")
            .setDescription("Shows a top gainers from today")
    )

export const run = async (interaction) => {

    if (interaction.options.getSubcommand() === 'twitter') {
        const channel = await Channel.findOne({ id: interaction.channel.id }) || new Channel({ id: interaction.channel.id })

        const url = interaction.options.getString("url")

        channel.twitter = url

        await channel.save()
    }

    if (interaction.options.getSubcommand() === 'discord') {
        const channel = await Channel.findOne({ id: interaction.channel.id }) || new Channel({ id: interaction.channel.id })

        const channelId = interaction.options.getString("channel_id")
        const invite = interaction.options.getString("invite")

        channel.invite = invite
        channel.discord = channelId

        await channel.save()
    }

    await interaction.editReply({ content: `Configurations changed.` })

    if (interaction.options.getSubcommand() === 'ranking') {
        const channel = await RankingMsg.findOne({ id: interaction.channel.id }) || new RankingMsg({ id: interaction.channel.id })

        await channel.save()
    }

    await interaction.editReply({ content: `Configurations changed.` })

    setTimeout(() => { interaction.deleteReply() }, 5000)
}