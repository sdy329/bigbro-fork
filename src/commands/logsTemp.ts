import { ApplyOptions } from '@sapphire/decorators';
import { Command, CommandOptionsRunTypeEnum } from '@sapphire/framework';
import { Subcommand } from '@sapphire/plugin-subcommands';
import {
    EmbedBuilder,
    PermissionFlagsBits,
    type ChatInputCommandInteraction,
} from 'discord.js';
import { Color } from '../lib/embeds';
import { moderationLogs } from '..';

enum SubcommandName {
    warnings = 'warnings',
    timeouts = 'timeouts',
    bans = 'bans'
}

const error = (interaction: ChatInputCommandInteraction, content: string) => {
    return interaction.followUp({
        embeds: [new EmbedBuilder().setColor(Color.Red).setDescription(content)],
        ephemeral: true,
    });
};

@ApplyOptions<Subcommand.Options>({
    description: 'Get a user\'s moderation history',
    requiredClientPermissions: [PermissionFlagsBits.ModerateMembers],
    requiredUserPermissions: [PermissionFlagsBits.ModerateMembers],
    runIn: [CommandOptionsRunTypeEnum.GuildAny],
    subcommands: [
        {
            name: SubcommandName.warnings,
            chatInputRun: async (interaction: ChatInputCommandInteraction) => {
                await interaction.deferReply({ ephemeral: true });

                if (!interaction.inGuild()) {
                    await error(interaction, 'Command only available in servers');
                    return;
                }
                const user = interaction.options.getUser(logsOptions.User, true);

                const guild = await interaction.client.guilds.fetch(interaction.guildId);
                const member = await guild.members.fetch(user);

                if (!member) {
                    await error(interaction, `${user} is not a member of this server`);
                    return;
                }

                const userLog = await moderationLogs.findOne(
                    { '_id.guild': interaction.guildId!, '_id.user': member.id },
                );

                const embed = new EmbedBuilder()
                    .setTitle(`${member.nickname ?? member.displayName} (${member.user.tag}) Warnings`)

                if (!userLog || !userLog.warning) {
                    embed.setDescription('User has no previous warnings')
                } else {
                    for (let i = 0; i < userLog.warning.length; i++) {
                        const staffMember = await guild.members.fetch(userLog.warning[i].user)
                        embed.addFields({
                            name: `Warning ${i + 1}`,
                            value: `Given by: ${staffMember} (${staffMember.user.tag})
                                    Reason: ${userLog.warning[i].reason}
                                    Date: ${userLog.warning[i].date.toLocaleString('en-US')}`
                        })
                    }
                }

                await interaction.followUp({
                    embeds: [
                        embed
                    ],
                    ephemeral: true,
                });
            },
        },
        {
            name: SubcommandName.timeouts,
            chatInputRun: async (interaction: ChatInputCommandInteraction) => {
                await interaction.deferReply({ ephemeral: true });

                if (!interaction.inGuild()) {
                    await error(interaction, 'Command only available in servers');
                    return;
                }
                const user = interaction.options.getUser(logsOptions.User, true);

                const guild = await interaction.client.guilds.fetch(interaction.guildId);
                const member = await guild.members.fetch(user);

                if (!member) {
                    await error(interaction, `${user} is not a member of this server`);
                    return;
                }

                const userLog = await moderationLogs.findOne(
                    { '_id.guild': interaction.guildId!, '_id.user': member.id },
                );

                const embed = new EmbedBuilder()
                    .setTitle(`${member.nickname ?? member.displayName} (${member.user.tag}) Timeouts`)

                if (!userLog || !userLog.timeout) {
                    embed.setDescription('User has no previous timeouts')
                } else {
                    for (let i = 0; i < userLog.timeout.length; i++) {
                        const staffMember = await guild.members.fetch(userLog.timeout[i].user)
                        embed.addFields({
                            name: `Timeout ${i + 1}`,
                            value: `Given by: ${staffMember} (${staffMember.user.tag})
                                    Reason: ${userLog.timeout[i].reason}
                                    Duration: ${userLog.timeout[i].duration}
                                    Date: ${userLog.timeout[i].date.toLocaleString('en-US')}`
                        })
                    }
                }

                await interaction.followUp({
                    embeds: [
                        embed
                    ],
                    ephemeral: true,
                });
            },
        },
        {
            name: SubcommandName.bans,
            chatInputRun: async (interaction: ChatInputCommandInteraction) => {
                await interaction.deferReply({ ephemeral: true });

                if (!interaction.inGuild()) {
                    await error(interaction, 'Command only available in servers');
                    return;
                }
                const user = interaction.options.getUser(logsOptions.User, true);

                const guild = await interaction.client.guilds.fetch(interaction.guildId);
                const member = await guild.members.fetch(user);

                if (!member) {
                    await error(interaction, `${user} is not a member of this server`);
                    return;
                }

                const userLog = await moderationLogs.findOne(
                    { '_id.guild': interaction.guildId!, '_id.user': member.id },
                );

                const embed = new EmbedBuilder()
                    .setTitle(`${member.nickname ?? member.displayName} (${member.user.tag}) Bans`)

                if (!userLog || !userLog.ban) {
                    embed.setDescription('User has no previous bans')
                } else {
                    for (let i = 0; i < userLog.ban.length; i++) {
                        const staffMember = await guild.members.fetch(userLog.ban[i].user)
                        embed.addFields({
                            name: `Warning ${i + 1}`,
                            value: `Given by: ${staffMember} (${staffMember.user.tag})
                                    Reason: ${userLog.ban[i].reason}
                                    Date: ${userLog.ban[i].date.toLocaleString('en-US')}`
                        })
                    }
                }

                await interaction.followUp({
                    embeds: [
                        embed
                    ],
                    ephemeral: true,
                });
            },
        },
    ],
})
export class LogsCommand extends Subcommand {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand(
            command =>
                command
                    .setName(this.name)
                    .setDescription(this.description)
                    .addSubcommand(warnings =>
                        warnings
                            .setName(SubcommandName.warnings)
                            .setDescription('Show the user\'s warning history')
                            .addUserOption(user =>
                                user
                                    .setName(logsOptions.User)
                                    .setDescription('The user to view')
                                    .setRequired(true)
                            )
                    )
                    .addSubcommand(timeouts =>
                        timeouts
                            .setName(SubcommandName.timeouts)
                            .setDescription('Show the user\'s timeout history')
                            .addUserOption(user =>
                                user
                                    .setName(logsOptions.User)
                                    .setDescription('The user to view')
                                    .setRequired(true)
                            )
                    )
                    .addSubcommand(bans =>
                        bans
                            .setName(SubcommandName.bans)
                            .setDescription('Show the user\'s ban history')
                            .addUserOption(user =>
                                user
                                    .setName(logsOptions.User)
                                    .setDescription('The user to view')
                                    .setRequired(true)
                            )
                    ),
            { idHints: ['988533666722488380', '985249852550168646'] }
        );
    }
}

enum logsOptions {
    User = 'user',

}
