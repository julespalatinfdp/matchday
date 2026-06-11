// src/commands/set-result.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { load, save } = require('../db');
const { buildMatchEmbed, buildButtons } = require('../matchEmbed');

// Points par choix
const BASE_POINTS = { 1: 2, 2: 4, 3: 8 };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-result')
    .setDescription('Définir le résultat d\'un match et attribuer les points')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o => o.setName('match_id').setDescription('ID du match').setRequired(true))
    .addIntegerOption(o =>
      o.setName('choix_gagnant')
        .setDescription('Choix gagnant (1, 2 ou 3)')
        .setRequired(true)
        .addChoices(
          { name: '1 – Chill (2 pts)', value: 1 },
          { name: '2 – Joueur (4 pts)', value: 2 },
          { name: '3 – Vraiiiment joueur (8 pts)', value: 3 },
        )
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const matchId      = interaction.options.getString('match_id');
    const winningChoice = interaction.options.getInteger('choix_gagnant');

    const db = load();
    const matchData = db.matches[matchId];

    if (!matchData) return interaction.editReply('❌ Match introuvable.');
    if (matchData.result !== undefined) return interaction.editReply('❌ Ce match a déjà un résultat.');

    matchData.result = winningChoice;
    matchData.status = 'closed';

    const bets = db.bets[matchId] || {};
    const basePoints = BASE_POINTS[winningChoice];
    let winners = 0;

    for (const [userId, bet] of Object.entries(bets)) {
      if (bet.choice === winningChoice) {
        const pts = bet.boosted ? basePoints * 2 : basePoints;
        if (!db.users[userId]) db.users[userId] = { totalPoints: 0, boostUsedToday: null, username: bet.username || userId };
        db.users[userId].totalPoints = (db.users[userId].totalPoints || 0) + pts;
        bet.points = pts;
        winners++;
      }
    }

    save(db);

    // Mettre à jour l'embed (passer en rouge / Fermé)
    try {
      const guild   = interaction.guild;
      const channel = await guild.channels.fetch(matchData.channelId);
      const msg     = await channel.messages.fetch(matchData.messageId);
      const embed   = buildMatchEmbed(matchData);
      const row     = buildButtons(matchId, false);
      await msg.edit({ embeds: [embed], components: [row] });
    } catch (e) {
      console.error('[set-result] Impossible de mettre à jour le message:', e.message);
    }

    await interaction.editReply(
      `✅ Résultat enregistré pour \`${matchId}\`.\n` +
      `Choix gagnant : **${winningChoice}** (${basePoints} pts de base)\n` +
      `${winners} gagnant(s) crédité(s).`
    );
  },
};
