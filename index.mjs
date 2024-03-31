import readline from 'readline';
import axios from 'axios';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const searchBaseUrl = 'https://bre4d-api.vercel.app/anime/gogoanime';
const downloadBaseUrl = 'https://api13.anime-dex.workers.dev';

async function main() {
  try {
    const query = 'One Piece'; // Example query
    const searchUrl = `${searchBaseUrl}/${query}`;

    const response = await axios.get(searchUrl);
    const data = response.data;

    if (data.results.length === 0) {
      console.log('No anime found with that name.');
      return;
    }

    let searchResults = 'Search Results:\n';
    data.results.forEach((anime, index) => {
      searchResults += `${index + 1}. ${anime.title}\n`;
    });

    console.log(searchResults);

    const selectedIndex = await askQuestion('Select an anime: ');
    const selectedAnime = data.results[selectedIndex - 1];

    const episodeNumber = await askQuestion('Enter the episode number: ');
    await sendLinks(selectedAnime.id, episodeNumber);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    rl.close();
  }
}

async function sendLinks(animeId, episodeNumber) {
  const watchUrl = `${searchBaseUrl}/watch/${animeId}-episode-${episodeNumber}`;
  const downloadUrl = `${downloadBaseUrl}/download/${animeId}-episode-${episodeNumber}`;

  const watchResponse = await axios.get(watchUrl, { params: { server: 'gogocdn' } });
  const watchData = watchResponse.data;

  const downloadResponse = await axios.get(downloadUrl);
  const downloadData = downloadResponse.data.results;

  console.log('Streaming Links:');
  watchData.sources.forEach((source, index) => {
    console.log(`[${source.quality}]: ${source.url}`);
  });

  console.log('Download Links:');
  Object.entries(downloadData).forEach(([quality, url]) => {
    console.log(`[${quality}]: ${url}`);
  });
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

main();
