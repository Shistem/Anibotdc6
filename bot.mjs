import { Client, GatewayIntentBits, Collection, ActivityType, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.json' assert { type: 'json' };
import { REST } from '@discordjs/rest';
import { WebhookClient } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const token = process.env.token
const rest = new REST({ version: '10' }).setToken(token);
const commands = [];
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
client.commands = new Collection();

const webhookClient = new WebhookClient({ url: config.webhookUrl });

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.mjs'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = (await import(filePath)).default;
  console.log(`${command.data.name} loaded`)
    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
}

client.once('ready', async () => {
  console.log(`Ready! Logged in as ${client.user.tag}`);

  // Register slash commands globally
  await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
  console.log('Successfully reloaded application (/) commands.');

  client.user.setPresence({ activities: [{ name: 'your mom while being idle', type: ActivityType.Watching }], status: 'idle' });
});
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    if (command.ownerOnly && interaction.user.id !== config.ownerId) {
        return interaction.reply({ content: 'This command can only be used by the bot owner.', ephemeral: true });
    }
    if (command.nsfwOnly && !interaction.channel.nsfw) {
        return interaction.reply({ content: 'This command can only be used in NSFW channels.', ephemeral: true });
    }
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await logError(interaction, error);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
});

client.on('error', async (error) => {
    console.error('Unhandled error:', error);
    await logError(null, error);
});

process.on('unhandledRejection', async (error) => {
    console.error('Unhandled promise rejection:', error);
    await logError(null, error);
});

async function logError(interaction, error) {
    try {
        await webhookClient.send({
            content: `
                **Command Used:** ${interaction.commandName || 'N/A'}
                **User:** ${interaction.user?.username || 'N/A'}#${interaction.user?.discriminator || 'N/A'}
                **Error:** ${error.message}
            `
        });
    } catch (err) {
        console.error('Error logging to webhook:', err);
    }
}

client.login(token)
    .then(() => console.log('Logged in!'))
    .catch((error) => {
        console.error(`Failed to log in: ${error}`);
        logLoginError(error);
    });

async function logLoginError(error) {
    try {
        await webhookClient.send({
            content: `
                **Error:** Failed to log in
                **Error Message:** ${error.message}
            `
        });
    } catch (err) {
        console.error('Error logging to webhook:', err);
    }
}
