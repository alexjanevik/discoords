import "dotenv/config";
import {
	Client,
	GatewayIntentBits,
	EmbedBuilder,
	Events,
	MessageFlags,
	PermissionFlagsBits,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} from "discord.js";

import { db } from "./db.js";

const client = new Client({
	intents: [GatewayIntentBits.Guilds],
});

const PAGE_SIZE = 12;

function buildCoordEmbed(guildId, page = 0) {
	const coords = db
		.prepare(
			"SELECT * FROM coords WHERE guild_id = ? ORDER BY id ASC",
		)
		.all(guildId);

	const totalPages = Math.max(
		1,
		Math.ceil(coords.length / PAGE_SIZE),
	);
	const safePage = Math.min(Math.max(page, 0), totalPages - 1);

	const start = safePage * PAGE_SIZE;
	const shown = coords.slice(start, start + PAGE_SIZE);

	const embed = new EmbedBuilder()
		.setTitle("Server Coordinates")
		.setDescription(
			coords.length === 0
				? "No coordinates have been added yet."
				: `Showing page ${safePage + 1} of ${totalPages}.`,
		)
		.setFooter({ text: `${coords.length} coordinate(s)` })
		.setTimestamp();

	for (const coord of shown) {
		embed.addFields({
			name: `${coord.id}: (${coord.x}, ${coord.z})`,
			value: `${coord.description} - <@${coord.user_id}>`,
			inline: false,
		});
	}

	return embed;
}

async function updatePersistentEmbed(guild, page = 0) {
	const config = db
		.prepare("SELECT * FROM config WHERE guild_id = ?")
		.get(guild.id);

	if (!config) {
		throw new Error(
			"No persistent coord embed has been set up yet. Use `/coord setup` first.",
		);
	}

	const coords = db
		.prepare(
			"SELECT * FROM coords WHERE guild_id = ? ORDER BY id ASC",
		)
		.all(guild.id);

	const totalPages = Math.max(
		1,
		Math.ceil(coords.length / PAGE_SIZE),
	);
	const safePage = Math.min(Math.max(page, 0), totalPages - 1);

	const targetChannel = await guild.channels.fetch(config.channel_id);
	const message = await targetChannel.messages.fetch(
		config.message_id,
	);

	await message.edit({
		embeds: [buildCoordEmbed(guild.id, safePage)],
		components: [buildPaginationButtons(safePage, totalPages)],
	});
}

client.once(Events.ClientReady, (readyClient) => {
	console.log(`Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
	if (interaction.isButton()) {
		if (!interaction.customId.startsWith("coord_page:")) return;

		const page = Number(interaction.customId.split(":")[1]);

		await updatePersistentEmbed(interaction.guild, page);

		return interaction.deferUpdate();
	}

	if (!interaction.isChatInputCommand()) return;
	if (interaction.commandName !== "coords") return;

	const subcommand = interaction.options.getSubcommand();

	try {
		if (subcommand === "setup") {
			const existing = db
				.prepare("SELECT * FROM config WHERE guild_id = ?")
				.get(interaction.guild.id);

			if (existing) {
				return interaction.reply({
					content:
						"A persistent coord embed already exists in the server",
					flags: MessageFlags.Ephemeral,
				});
			}

			const message = await interaction.channel.send({
				embeds: [buildCoordEmbed(interaction.guild.id, 0)],
				components: [buildPaginationButtons(0, 1)],
			});

			db.prepare(
				`
        INSERT INTO config (guild_id, channel_id, message_id)
        VALUES (?, ?, ?)
      `,
			).run(interaction.guild.id, interaction.channel.id, message.id);

			await message.pin().catch(() => null);

			return interaction.reply({
				content: "Persistent embed created.",
				flags: MessageFlags.Ephemeral,
			});
		}

		if (subcommand === "add") {
			const x = interaction.options.getInteger("x");
			const z = interaction.options.getInteger("z");
			const description =
				interaction.options.getString("description");

			db.prepare(
				`
        INSERT INTO coords (guild_id, x, z, description, user_id)
        VALUES (?, ?, ?, ?, ?)
      `,
			).run(
				interaction.guild.id,
				x,
				z,
				description,
				interaction.user.id,
			);

			await updatePersistentEmbed(interaction.guild);

			return interaction.reply({
				content: "Coordinate added",
				flags: MessageFlags.Ephemeral,
			});
		}

		if (subcommand === "refresh") {
			await updatePersistentEmbed(interaction.guild);

			return interaction.reply({
				content: "Persistent embed refreshed",
				flags: MessageFlags.Ephemeral,
			});
		}

		if (subcommand === "update") {
			const id = interaction.options.getInteger("id");
			const coord = db
				.prepare("SELECT * FROM coords WHERE guild_id = ? AND id = ?")
				.get(interaction.guild.id, id);
			const x = interaction.options.getInteger("x") ?? coord.x;
			const z = interaction.options.getInteger("z") ?? coord.z;
			const description =
				interaction.options.getString("description") ??
				coord.description;

			if (!coord) {
				return interaction.reply({
					content: "ID not found",
					flags: MessageFlags.Ephemeral,
				});
			}

			const isOwner = coord.user_id === interaction.user.id;
			const isMod = interaction.memberPermissions.has(
				PermissionFlagsBits.ManageMessages,
			);

			if (!isOwner && !isMod) {
				return interaction.reply({
					content:
						"Requires 'Manage Messages' permission to update coordinates added by other users",
					flags: MessageFlags.Ephemeral,
				});
			}

			db.prepare(
				`
				UPDATE coords SET x = ?, z = ?, description = ?
				WHERE guild_id = ? AND id = ?
			`,
			).run(x, z, description, interaction.guild.id, id);

			await updatePersistentEmbed(interaction.guild);

			return interaction.reply({
				content: `Coordinate updated (ID: ${id})`,
				flags: MessageFlags.Ephemeral,
			});
		}

		if (subcommand === "delete") {
			const id = interaction.options.getInteger("id");

			const coord = db
				.prepare("SELECT * FROM coords WHERE guild_id = ? AND id = ?")
				.get(interaction.guild.id, id);

			if (!coord) {
				return interaction.reply({
					content: "ID not found",
					flags: MessageFlags.Ephemeral,
				});
			}

			const isOwner = coord.user_id === interaction.user.id;
			const isMod = interaction.memberPermissions.has(
				PermissionFlagsBits.ManageMessages,
			);

			if (!isOwner && !isMod) {
				return interaction.reply({
					content:
						"Requires 'Manage Messages' permission to delete coordinates added by other users",
					flags: MessageFlags.Ephemeral,
				});
			}

			db.prepare(
				"DELETE FROM coords WHERE guild_id = ? AND id = ?",
			).run(interaction.guild.id, id);

			await updatePersistentEmbed(interaction.guild);

			return interaction.reply({
				content: `Coordinate deleted (ID: ${id})`,
				flags: MessageFlags.Ephemeral,
			});
		}
	} catch (error) {
		console.error(error);

		return interaction.reply({
			content: error.message ?? "Something went wrong",
			flags: MessageFlags.Ephemeral,
		});
	}
});

function buildPaginationButtons(page, totalPages) {
	return new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId(`coord_page:${page - 1}`)
			.setLabel("Previous")
			.setStyle(ButtonStyle.Primary)
			.setDisabled(page <= 0),

		new ButtonBuilder()
			.setCustomId(`coord_page:${page + 1}`)
			.setLabel("Next")
			.setStyle(ButtonStyle.Primary)
			.setDisabled(page >= totalPages - 1),
	);
}

client.login(process.env.DISCORD_TOKEN);
