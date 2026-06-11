const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function buildMatchEmbed(match) {
  const isOpen = match.status === 'open';
  const color  = isOpen ? 0x00C853 : 0xE10014;
  const statusLabel = isOpen ? 'Ouvert' : 'Fermé';
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${match.title} (${statusLabel})`)
    .setDescription(`⏰ Fin des mises: **${match.closingTimeLabel}**\n\u200B`);
  embed.addFields({ name: `1. 🤙 ${match.choice1Label}`, value: `*${match.choice1Odds}*\n\u200B`, inline: false });
  embed.addFields({ name: `2. ⚡ ${match.choice2Label}`, value: `*${match.choice2Odds}*\n\u200B`, inline: false });
  embed.addFields({ name: `3. 🔥 ${match.choice3Label}`, value: `*${match.choice3Odds}*\n\u200B`, inline: false });
  if (match.imageUrl) embed.setImage(match.imageUrl);
  return embed;
}

function buildButtons(matchId, isOpen) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`bet_${matchId}_1`).setLabel('🤙 Chill (+2 pts)').setStyle(ButtonStyle.Secondary).setDisabled(!isOpen),
    new ButtonBuilder().setCustomId(`bet_${matchId}_2`).setLabel('⚡ Joueur (+4 pts)').setStyle(ButtonStyle.Primary).setDisabled(!isOpen),
    new ButtonBuilder().setCustomId(`bet_${matchId}_3`).setLabel('🔥 Vraiiiment joueur (+8 pts)').setStyle(ButtonStyle.Danger).setDisabled(!isOpen),
  );
  return row;
}

module.exports = { buildMatchEmbed, buildButtons };
