const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { load, save } = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset-scores')
    .setDescription('[ADMIN] Réinitialiser les points et boosts de tous les membres')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const db = load();

    Object.keys(db.users).forEach(id => {
      db.users[id].totalPoints = 0;
      db.users[id].boostUsedToday = null;
    });

    Object.keys(db.bets).forEach(matchId => {
      db.bets[matchId] = {};
    });

    db.matches = {};

    save(db);

    await interaction.editReply('✅ Tous les points, boosts et paris ont été réinitialisés.');
  },
};
