import { SlashCommandBuilder } from '@discordjs/builders';
import { shortenURL,handleSearch, handleError,sendLinks } from './extra/ani.mjs';
import config from '../config.json' assert { type: 'json' };
import axios from 'axios';
import { ButtonBuilder, ActionRowBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('animedown')
        .setDescription('Search and get download links.')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('The anime name to search for.')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('episode')
                .setDescription('The episode number to download.')
                .setRequired(true)
        ),

    async execute(interaction) {
        const query = interaction.options.getString('query');
        const episodeNumber = interaction.options.getInteger('episode');
        const searchUrl = `${config.searchBaseUrl}/${query}`;

        try {
            const selectedAnime = await handleSearch(interaction, searchUrl);
          await interaction.channel.sendTyping();
            await sendLinks(selectedAnime.id, interaction, episodeNumber);
        } catch (error) {
            console.error('Error searching 😭😭💀', error);
            await handleError(interaction, error);
        }
    }
};