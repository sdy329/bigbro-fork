import { ApplyOptions } from '@sapphire/decorators';
import { Command, CommandOptionsRunTypeEnum } from '@sapphire/framework';
import {
    PermissionFlagsBits,
    EmbedBuilder,
    type ChatInputCommandInteraction,
} from 'discord.js';
import { Color } from '../lib/embeds';
import { messageLogger } from '..';
import { moderationLogs } from '..';
import type { warnLog } from '../lib/moderation';

@ApplyOptions<Command.Options>({
    description: 'Warn user',
    requiredClientPermissions: [PermissionFlagsBits.ModerateMembers],
    requiredUserPermissions: [PermissionFlagsBits.ModerateMembers],
    runIn: [CommandOptionsRunTypeEnum.GuildAny],
})
export class WarnCommand extends Command {

    public override async chatInputRun(interaction: ChatInputCommandInteraction) {
        if (!interaction.inGuild()) {
            return;
        }
        const user = interaction.options.getUser(Option.User, true);
        const reason = interaction.options.getString(Option.Reason);

        const guild = await interaction.client.guilds.fetch(interaction.guildId);
        const member = await guild.members.fetch(user);

        if (!member) {
            await interaction.reply({
                content: `Error: ${user} is not a member of this server`,
                ephemeral: true,
            });
            return;
        }

        if (!reason) {
            await interaction.reply({
                content: `Error: Warnings require a reason.`,
                ephemeral: true,
            });
            return;
        }

        const filter = { '_id.guild': interaction.guildId!, '_id.user': member.id };

        const userWarning: warnLog = {
            date: new Date(),
            user: interaction.user.id,
            reason: reason
        };

        const update = {
            $push: {
                warning: userWarning
            }
        };

        const options = { upsert: true };

        moderationLogs.findOneAndUpdate(filter, update, options);

        await interaction.reply({
            content: `${user.tag} warned for ${reason}`,
            ephemeral: true,
        });

        const embed = new EmbedBuilder()
            .setColor(Color.Red)
            .setTitle('You Have Been Warned')
            .addFields(
                { name: 'Server', value: `${guild.name}` },
                { name: 'Reason', value: reason },
            )
            .setTimestamp(interaction.createdTimestamp);

        await member.send({ embeds: [embed] });

        messageLogger.logMemberWarning(
            member,
            interaction.user,
            reason,
            interaction.createdTimestamp
        );
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand(
            command =>
                command
                    .setName(this.name)
                    .setDescription(this.description)
                    .addUserOption(user =>
                        user
                            .setName(Option.User)
                            .setDescription('The user to warn')
                            .setRequired(true)
                    )
                    .addStringOption(reason =>
                        reason
                            .setName(Option.Reason)
                            .setDescription('The reason for warning them')
                            .setRequired(true)
                    ),
            { idHints: [] }
        );
    }
}

enum Option {
    User = 'user',
    Reason = 'reason',
}