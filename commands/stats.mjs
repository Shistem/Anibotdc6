import { SlashCommandBuilder } from '@discordjs/builders';
import { EmbedBuilder, version as discordJsVersion } from 'discord.js';
import config from '../config.json' assert { type: 'json' };
import os from 'os';

export default {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('my stats'),

  async execute(interaction) {
    try {
      // Get CPU usage
      const cpus = os.cpus();
      let totalIdle = 0, totalTick = 0;
      for (let i = 0, len = cpus.length; i < len; i++) {
        const cpu = cpus[i];
        for (let type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      }

      const totalUsage = totalTick - totalIdle;
      const cpuPercentage = (100 - ~~(100 * totalIdle / totalTick));

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Stats')
        .addFields(
          {
            name: 'Uptime',
            value: `${process.uptime()} seconds`,
            inline: true
          },
          {
            name: 'Ping',
            value: `${interaction.client.ws.ping}ms`,
            inline: true
          },
          {
            name: 'RAM Usage',
            value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
            inline: false
          },
          {
            name: 'Owner',
            value: `<@!${config.ownerId}>`,
            inline: false
          },
          {
            name: 'Discord.js Version',
            value: `v${discordJsVersion}`,
            inline: false
          },
          {
            name: 'Node.js Version',
            value: process.version,
            inline: false
          },
          {
            name: 'CPU Usage',
            value: `${cpuPercentage}%`,
            inline: false
          }
        )
        .setFooter({ text: 'Powered by Discord.js' });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error executing /stats command:', error);
      await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
  }
};