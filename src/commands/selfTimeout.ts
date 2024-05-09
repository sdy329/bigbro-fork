import { ApplyOptions } from '@sapphire/decorators';
import { Command, CommandOptionsRunTypeEnum } from '@sapphire/framework';
import {
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder,
    type ChatInputCommandInteraction,
} from 'discord.js';
import { Color } from '../lib/embeds';
import { InputId, ModalId } from '../lib/sTimeout';

const error = (interaction: ChatInputCommandInteraction, content: string) => {
    return interaction.followUp({
        embeds: [new EmbedBuilder().setColor(Color.Red).setDescription(content)],
        ephemeral: true,
    });
};

@ApplyOptions<Command.Options>({
    description: 'Allow users to timeout themselves',
    runIn: [CommandOptionsRunTypeEnum.GuildAny],
})
export class SelfTimeoutCommand extends Command {
    public override async chatInputRun(interaction: ChatInputCommandInteraction) {
        if (!interaction.inGuild()) {
            await error(interaction, 'Command only available in servers');
            return;
        }

        const timeoutModal = new ModalBuilder()
            .setCustomId(ModalId.sTimeout)
            .setTitle('Provide the information for your timeout')
            .setComponents(
                new ActionRowBuilder<TextInputBuilder>().setComponents(
                    new TextInputBuilder()
                        .setCustomId(InputId.Duration)
                        .setLabel('Duration of the timeout')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('')
                        .setRequired(true)
                ),
                new ActionRowBuilder<TextInputBuilder>().setComponents(
                    new TextInputBuilder()
                        .setCustomId(InputId.Unit)
                        .setLabel('Time unit')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('day│hour│minute│second')
                        .setRequired(true)
                ),
                new ActionRowBuilder<TextInputBuilder>().setComponents(
                    new TextInputBuilder()
                        .setCustomId(InputId.Reason)
                        .setLabel('Reason')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder(
                            'Provide a brief reason or explanation as to why you are timing yourself out.'
                        )
                )
            );
        await interaction.showModal(timeoutModal);
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand(
            command =>
                command
                    .setName(this.name)
                    .setDescription(this.description),
            { idHints: ['1140355301493702746'] }
        );
    }
}