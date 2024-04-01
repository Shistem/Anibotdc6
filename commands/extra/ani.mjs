import axios from 'axios';
import config from '../../config.json' assert { type: 'json' };
import { ButtonBuilder, ActionRowBuilder, EmbedBuilder } from 'discord.js';
import { WebhookClient } from 'discord.js';

const webhookClient = new WebhookClient({ url: config.webhookUrl });

export async function handleSearch(interaction, searchUrl) {
  try {
    const response = await axios.get(searchUrl);
    const data = response.data;

    if (data.results.length === 0) {
      await interaction.reply({ content: 'Not found with that name.', ephemeral: true });
      return null;
    }

    const animeButtons = data.results.slice(0, 5).map((anime, index) => new ButtonBuilder()
      .setCustomId(`select_anime_${index}`)
      .setLabel(`${index + 1}. ${anime.title}`)
      .setStyle('Primary')
    );

    const row = new ActionRowBuilder().addComponents(animeButtons);

    await interaction.reply({ content: 'Please select an anime:', components: [row], fetchReply: true });

    const filter = i => i.user.id === interaction.user.id && i.isButton();
    const responseSelect = await interaction.channel.awaitMessageComponent({ filter, time: 60000, errors: ['time'] });

    if (!responseSelect) {
      await interaction.editReply({ content: 'Interaction timeout.' });
      return null;
    }

    const selectedIndex = parseInt(responseSelect.customId.split('_')[2]);

    if (selectedIndex < 0 || selectedIndex >= data.results.length) {
      await interaction.editReply({ content: 'Invalid selection.' });
      return null;
    }

    const selectedAnime = data.results[selectedIndex];
    await responseSelect.update({ content: `Selected ${selectedAnime.title} now fetching download links`, components: [] });
    return selectedAnime;
  } catch (error) {
    console.error('Error searching:', error);
    await handleError(interaction, error);
    throw error;
  }
}




export async function handleError(interaction, error) {
  if (error.response && error.response.data) {
    await interaction.channel.send({ content: `An error occurred while searching for the anime,maybe check episode number and anime name again`, ephemeral: true });
    await logError(interaction, error);
  } else {
    console.log("another error i am at lije 81 ani.mjs")
    await logError(interaction, error);
  }
}

async function logError(interaction, error) {
  try {
    await webhookClient.send({
      content: `
        **Command Used:** /animedown
        **User:** ${interaction.user.username}#${interaction.user.discriminator}
        **Error:** ${error.message}
      `
    });
  } catch (err) {
    console.error('Error logging to webhook:', err);
  }
}

export async function shortenURL(longURL) {
  try {
    const response = await axios.get(`http://tinyurl.com/api-create.php?url=${encodeURIComponent(longURL)}`);
    return response.data;
  } catch (error) {
    console.error('Error shortening URL:', error);
    return longURL;
  }
}
export async function checkEpisodeAvailability(animeId, episodeNumber, interaction) {
  try {
    const response = await axios.get(`${config.searchBaseUrl}/info/${animeId}`);
    const totalEpisodes = response.data.totalEpisodes;

    if (episodeNumber > totalEpisodes) {
      console.log(`Episode ${episodeNumber} is not available. The anime has only ${totalEpisodes} episodes.`)
      await interaction.channel.send({
        content: `Episode ${episodeNumber} is not available. The anime has only ${totalEpisodes} episodes. Please select a valid episode number.`,
        ephemeral: true
      });
    }

    return totalEpisodes;
  } catch (error) {
    throw new Error(`Error fetching anime info: ${error.message}`);
  }
}
export async function sendLinks(animeId, interaction, episodeNumber) {
  try {
    const totalEpisodes = await checkEpisodeAvailability(animeId, episodeNumber);

    // If the episode is not available, notify the user and return
    if (episodeNumber > totalEpisodes) {
      await interaction.channel.send({
        content: `Episode ${episodeNumber} is not available. The anime has only ${totalEpisodes} episodes. Please select a valid episode number.`,
        ephemeral: true
      });
      return;
    }

    const watchUrl = `${config.searchBaseUrl}/watch/${animeId}-episode-${episodeNumber}`;
    const downloadUrl = `${config.downloadBaseUrl}/download/${animeId}-episode-${episodeNumber}`;

    // Fetch the watch and download data
    const [watchResponse, downloadResponse] = await Promise.all([
      axios.get(watchUrl, { params: { server: 'gogocdn' } }),
      axios.get(downloadUrl)
    ]);

    const watchData = watchResponse.data;
    const downloadData = downloadResponse.data.results;

    const streamingLinks = [];
    const downloadLinks = [];

    // Process streaming links
    for (const source of watchData.sources) {
      const shortenedURL = await shortenURL(source.url);
      streamingLinks.push(`[${source.quality}](${shortenedURL})`);
    }

    // Process download links
    for (const [quality, url] of Object.entries(downloadData)) {
      const shortenedURL = await shortenURL(url);
      downloadLinks.push(`[${quality}](${shortenedURL})`);
    }

    let linksText = '';

    // Add streaming links to the message
    if (streamingLinks.length > 0) {
      linksText += `**Streaming Links:**\n${streamingLinks.join('\n')}\n\n`;
    } else {
      linksText += 'No streaming links available.\n\n';
    }

    // Add download links to the message
    if (downloadLinks.length > 0) {
      linksText += `**Download Links:**\n${downloadLinks.join('\n')}`;
    } else {
      linksText += 'No download links available.';
    }

    // Create the embed message
    const embed = new EmbedBuilder()
      .setTitle(`Episode ${episodeNumber}`)
      .setDescription(linksText)
      .setColor('#0099ff'); // Set the color of the embed

    // Send the embed message
    await interaction.channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error sending links:', error);
    await handleError(interaction, error);
  }
}

async function logDownload(interaction, animeId, episodeNumber) {
  try {
    await webhookClient.send({
      content: `
        **Command Used:** /animedown
        **User:** ${interaction.user.username}#${interaction.user.discriminator}
        **Anime ID:** ${animeId}
        **Episode Number:** ${episodeNumber}
      `
    });
  } catch (err) {
    console.error('Error logging to webhook:', err);
  }
}
