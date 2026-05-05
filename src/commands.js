import "dotenv/config";
import {
	REST,
	Routes,
	SlashCommandBuilder,
	PermissionFlagsBits,
} from "discord.js";

const commands = [
	new SlashCommandBuilder()
		.setName("coord")
		.setDescription("Manage server coordinates")
		.addSubcommand((sub) =>
			sub
				.setName("setup")
				.setDescription(
					"Create the persistent coordinate embed in this channel",
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName("update")
				.setDescription(
					"Update the persistent coordinate embed with the latest coordinates",
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName("add")
				.setDescription("Add a coordinate")
				.addIntegerOption((opt) =>
					opt
						.setName("x")
						.setDescription("X coordinate")
						.setRequired(true),
				)
				.addIntegerOption((opt) =>
					opt
						.setName("y")
						.setDescription("Y coordinate")
						.setRequired(true),
				)
				.addIntegerOption((opt) =>
					opt
						.setName("z")
						.setDescription("Z coordinate")
						.setRequired(true),
				)
				.addStringOption((opt) =>
					opt
						.setName("description")
						.setDescription("Description")
						.setRequired(true),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName("delete")
				.setDescription("Delete a coordinate by ID")
				.addIntegerOption((opt) =>
					opt
						.setName("id")
						.setDescription("Coordinate ID")
						.setRequired(true),
				),
		)
		.setDefaultMemberPermissions(null)
		.toJSON(),
];

const rest = new REST({ version: "10" }).setToken(
	process.env.DISCORD_TOKEN,
);

await rest.put(
	Routes.applicationGuildCommands(
		process.env.CLIENT_ID,
		process.env.GUILD_ID,
	),
	{ body: commands },
);

console.log("Commands deployed.");
