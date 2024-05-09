import { ApplyOptions } from '@sapphire/decorators';
import { Command, CommandOptionsRunTypeEnum } from '@sapphire/framework';
import {
    ActionRowBuilder,
    bold,
    ButtonBuilder,
    StringSelectMenuBuilder,
    ButtonStyle,
    EmbedBuilder,
    hyperlink,
    inlineCode,
    PermissionFlagsBits,
    type ChatInputCommandInteraction,
    type Collection,
    type GuildMember,
    type InteractionReplyOptions,
} from 'discord.js';
import type { AbstractCursor } from 'mongodb';
import { messageCounts } from '..';
import type { MessageCount } from '../lib/leaderboard';/*
import { moderationLogs } from '..';
import type { ModerationLog } from '../lib/moderation';*/
import { userUrl } from '../lib/user';

@ApplyOptions<Command.Options>({
    description: 'Get a user\'s moderation history',
    requiredClientPermissions: [PermissionFlagsBits.ModerateMembers],
    requiredUserPermissions: [PermissionFlagsBits.ModerateMembers],
    runIn: [CommandOptionsRunTypeEnum.GuildAny],
})
export class LogsCommand extends Command {

    public override async chatInputRun(interaction: ChatInputCommandInteraction) {
        if (!interaction.inGuild()) {
            return;
        }

        const user = interaction.options.getUser(Logs.User, true);
        const guild = await interaction.client.guilds.fetch(interaction.guildId);
        const member = await guild.members.fetch(user);

        if (!member) {
            await interaction.reply({
                content: `Error: ${user} is not a member of this server`,
                ephemeral: true,
            });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        let page = 0;
        const leaderboardUsers = messageCounts
            .aggregate<MessageCount>()
            .match({ '_id.guild': interaction.guildId, '_id.user': member.id })
            .group<LeaderboardUser>({ _id: '$_id.user', count: { $sum: '$count' } })
            .project<LeaderboardUser>({ count: true })
            .sort({ count: -1 });
        const cachedPages = new Array<string>();

        const replyOptions = async (): Promise<InteractionReplyOptions> => ({
            embeds: [
                new EmbedBuilder()
                    .setTitle(Logs.Title)
                    .setDescription(
                        await this.page(
                            page,
                            leaderboardUsers,
                            await guild.members.fetch(),
                            cachedPages
                        )
                    ),
            ],
            components: [
                await this.selectActionRow(),
                await this.buttonActionRow(page, leaderboardUsers, cachedPages.length),
            ],
        });
        const reply = await interaction.editReply({
            fetchReply: true,
            ...(await replyOptions()),
        });

        const collector = reply.createMessageComponentCollector();
        collector.on('collect', async i => {
            await i.deferUpdate();
            if (i.customId === Logs.ButtonPrev) {
                page--;
            } else if (i.customId === Logs.ButtonNext) {
                page++;
            }
            await i.editReply(await replyOptions());
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand(
            command =>
                command
                    .setName(this.name)
                    .setDescription(this.description)
                    .addUserOption(user =>
                        user
                            .setName(Logs.User)
                            .setDescription('The user to view')
                            .setRequired(true)
                    ),
            { idHints: [] }
        );
    }

    private async page(
        index: number,
        leaderboardUsers: AbstractCursor<LeaderboardUser>,
        members: Collection<string, GuildMember>,
        cache: string[]
    ) {
        if (index < cache.length) {
            return cache[index];
        }
        const users = new Array<LeaderboardUser>();
        for (let i = 0; i < Logs.PageSize;) {
            const user = await leaderboardUsers.next();
            if (!user) {
                break;
            }
            if (!members.has(user._id)) {
                continue;
            }
            users.push(user);
            i++;
        }
        const start = index * Logs.PageSize;
        const page = users
            .map(({ _id, count }, i) => [
                this.formatRank(start + i),
                this.formatUser(members, _id),
                inlineCode(`${count} messages`),
            ])
            .map(columns => columns.join(' '))
            .join('\n');
        cache.push(page);
        return page;
    }

    private formatRank(index: number) {
        return bold(inlineCode(`#${String(index + 1).padEnd(3)}`));
    }

    private formatUser(
        members: Collection<string, GuildMember>,
        userId: string
    ): string {
        const member = members.get(userId);
        return hyperlink(
            member?.nickname ?? member?.user.username ?? userId,
            userUrl(userId)
        );
    }



    private async selectActionRow() {
        return new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
            new StringSelectMenuBuilder()
                .setCustomId(Logs.Category)
                .addOptions([
                    {
                        label: "User",
                        description: "User's information",
                        value: "user",
                    },
                    {
                        label: "Warnings",
                        description: "Warning history",
                        value: "warnings",
                    },
                    {
                        label: "Timeouts",
                        description: "Timeout history",
                        value: "timeouts"
                    },
                    {
                        label: "Bans",
                        description: "Ban history",
                        value: "bans"
                    },
                ]),
        );
    }

    private async buttonActionRow(
        page: number,
        leaderboardUsers: AbstractCursor<LeaderboardUser>,
        cachedPages: number
    ) {
        const isLastPage =
            page === cachedPages - 1 && !(await leaderboardUsers.hasNext());
        return new ActionRowBuilder<ButtonBuilder>().setComponents(
            new ButtonBuilder()
                .setCustomId(Logs.ButtonPrev)
                .setStyle(ButtonStyle.Primary)
                .setEmoji('◀️')
                .setDisabled(page === 0),
            new ButtonBuilder()
                .setCustomId(Logs.ButtonNext)
                .setStyle(ButtonStyle.Primary)
                .setEmoji('▶️')
                .setDisabled(isLastPage)
        );
    }
}

interface LeaderboardUser {
    _id: string;
    count: number;
}

enum Logs {
    User = 'user',
    Title = 'title',
    ButtonPrev = 'prev',
    ButtonNext = 'next',
    PageSize = 5,
    Category = 'category',
}
