// src/matchEmbed.js – Construction de l'embed + boutons
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * Construit l'embed d'un match selon son état (ouvert/fermé)
 */
function buildMatchEmbed(match) {
  const isOpen = match.status === 'open';

  // Couleur de la barre latérale : vert si ouvert, rouge si fermé
  const color = isOpen ? 0x00C853 : 0xE10014;

  const statusLabel = isOpen ? 'Ouvert' : 'Fermé';

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${match.title} (${statusLabel})`)
    .setDescription(`⏰ Fin des mises: **${match.closingTimeLabel}**\n\u200B`);

  // Choix 1 – Chill
  embed.addFields({
    name: `1. 🤙 ${match.choice1Label}`,
    value: `*${match.choice1Odds}*\n\u200B`,
    inline: false,
  });

  // Choix 2 – Joueur
  embed.addFields({
    name: `2. ⚡ ${match.choice2Label}`,
    value: `*${match.choice2Odds}*\n\u200B`,
    inline: false,
  });

  // Choix 3 – Vraiiiment joueur
  embed.addFields({
    name: `3. 🔥 ${match.choice3Label}`,
    value: `*${match.choice3Odds}*\n\u200B`,
    inline: false,
  });

  // Image optionnelle
  if (match.imageUrl) {
    embed.setImage(match.imageUrl);
  }

  embed.setFooter({ text: 'Betclic · FIFA World Cup 2026™' });

  return embed;
}

/**
 * Construit la rangée de boutons (désactivés si match fermé)
 */
function buildButtons(matchId, isOpen) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`bet_${matchId}_1`)
      .setLabel('🤙 Chill')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!isOpen),

    new ButtonBuilder()
      .setCustomId(`bet_${matchId}_2`)
      .setLabel('⚡ Joueur')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!isOpen),

    new ButtonBuilder()
      .setCustomId(`bet_${matchId}_3`)
      .setLabel('🔥 Vraiiiment joueur')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!isOpen),
  );
  return row;
}

module.exports = { buildMatchEmbed, buildButtons };
