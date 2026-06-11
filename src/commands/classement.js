// src/commands/classement.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { load } = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('classement')
    .setDescription('Affiche le classement des parieurs du jour ou général')
    .addStringOption(o =>
      o.setName('type')
        .setDescription('Classement à afficher')
        .setRequired(false)
        .addChoices(
          { name: 'Général (tous les points)', value: 'general' },
          { name: 'Aujourd\'hui seulement', value: 'today' },
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const type = interaction.options.getString('type') || 'general';
    const db   = load();
    const users = db.users || {};

    let sorted;

    if (type === 'general') {
      sorted = Object.entries(users)
        .map(([id, u]) => ({ id, pts: u.totalPoints || 0, username: u.username || id }))
        .sort((a, b) => b.pts - a.pts)
        .slice(0, 20);
    } else {
      // Points du jour : on agrège les paris du jour sur les matchs avec résultat
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayPoints = {};

      for (const [matchId, bets] of Object.entries(db.bets || {})) {
        const match = db.matches[matchId];
        if (!match || !match.result || !match.closingTimeUTC) continue;
        if (!match.closingTimeUTC.startsWith(todayStr)) continue;

        const basePoints = { 1: 2, 2: 4, 3: 8 }[match.result];
        for (const [userId, bet] of Object.entries(bets)) {
          if (bet.choice === match.result) {
            const pts = bet.boosted ? basePoints * 2 : basePoints;
            todayPoints[userId] = (todayPoints[userId] || 0) + pts;
          }
        }
      }

      sorted = Object.entries(todayPoints)
        .map(([id, pts]) => ({
          id,
          pts,
          username: users[id]?.username || id,
        }))
        .sort((a, b) => b.pts - a.pts)
        .slice(0, 20);
    }

    if (!sorted.length) {
      return interaction.editReply('Aucun point enregistré pour le moment.');
    }

    const medals = ['🥇', '🥈', '🥉'];
    const lines = sorted.map((u, i) => {
      const medal = medals[i] || `**${i + 1}.**`;
      return `${medal} <@${u.id}> — **${u.pts} pts**`;
    });

    const embed = new EmbedBuilder()
      .setColor(0xE10014)
      .setTitle(type === 'general' ? '🏆 Classement Général – Coupe du Monde 2026' : `🗓️ Classement du Jour`)
      .setDescription(lines.join('\n'))
      .setFooter({ text: 'Betclic · FIFA World Cup 2026™' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
