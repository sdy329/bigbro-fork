import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import {
    EmbedBuilder,
    inlineCode,
    type Interaction,
    type ModalSubmitInteraction,
} from 'discord.js';
import { DurationUnit } from '../../lib/duration';
import { Color } from '../../lib/embeds';
import { InputId, ModalId } from '../../lib/sTimeout';
import { messageLogger } from '../..';

@ApplyOptions<Listener.Options>({ event: Events.InteractionCreate })
export class InteractionCreateListener extends Listener<
    typeof Events.InteractionCreate
> {

    private static readonly MaxTimeoutMilliseconds = 2_419_200_000; // 28 days
    private static readonly MillisecondsByUnit = DurationUnit.values().reduce(
        (map, unit) => map.set(unit.name, unit.milliseconds),
        new Map<string, number>()
    );

    public override async run(interaction: Interaction) {
        if (
            !interaction.isModalSubmit() ||
            interaction.customId !== ModalId.sTimeout ||
            !interaction.inGuild()
        ) {
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        const duration = interaction.fields.getTextInputValue(InputId.Duration).trim();
        if (!duration) {
            return this.sendValidationFailure(
                interaction,
                'Duration must contain at least 1 non-whitespace character'
            );
        }
        if (isNaN(parseInt(duration))) {
            return this.sendValidationFailure(
                interaction,
                'Duration may contain only numeric values'
            );
        }

        const unit = interaction.fields.getTextInputValue(InputId.Unit).trim();
        if (!unit) {
            return this.sendValidationFailure(
                interaction,
                'Unit must contain at least 1 non-whitespace character'
            );
        }
        if (!DurationUnit.values().find(
            ({ name }) => name.toLowerCase() === unit.toLowerCase())
        ) {
            return this.sendValidationFailure(
                interaction,
                `Duration Unit must be one of: ${DurationUnit.values()
                    .map(({ name }) => inlineCode(name))
                    .join('│')}`
            );
        }

        const reason = interaction.fields.getTextInputValue(InputId.Reason).trim();
        if (!reason) {
            return this.sendValidationFailure(
                interaction,
                'Reason must contain at least 1 non-whitespace character'
            );
        }

        const guild = await interaction.client.guilds.fetch(interaction.guildId);
        const member = await guild.members.fetch(interaction.member.user.id);

        const durationMilliseconds = parseInt(duration) * InteractionCreateListener.MillisecondsByUnit.get(unit)!;

        const readableDuration = `${duration} ${unit}${parseInt(duration) ? 's' : ''}`;

        if (durationMilliseconds > InteractionCreateListener.MaxTimeoutMilliseconds) {
            return this.sendValidationFailure(
                interaction,
                `Error: ${readableDuration} is greater than the maximum timeout duration (28 days)`
            );
        }

        member.timeout(durationMilliseconds, reason ?? undefined);

        interaction.editReply({
            content: `You have timed yourself out for ${readableDuration}`,
        });

        messageLogger.logMemberSelfTimeout(
            member,
            durationMilliseconds,
            readableDuration,
            reason,
            interaction.createdTimestamp
        );
    }

    private async sendValidationFailure(
        interaction: ModalSubmitInteraction,
        description: string
    ) {
        await interaction.editReply({
            embeds: [
                new EmbedBuilder().setColor(Color.Red).setDescription(description),
            ],
        });
    }
}
