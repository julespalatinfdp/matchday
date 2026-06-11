function getParisDayKey() { const now = new Date(); const parisDate = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' })); const h = parisDate.getHours(); const d = new Date(parisDate); if (h < 12) d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); }
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { load } = require('../db');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('classement')
    .setDescription('Affiche le classement des parieurs')
    .addStringOption(o => o.setName('type').setDescription('Classement à afficher').setRequired(false)
      .addChoices({ name: 'Général', value: 'general' }, { name: "Aujourd'hui", value: 'today' })),
  async execute(interaction) {
    await interaction.deferReply();
    const type = interaction.options.getString('type') || 'general';
    const db = load();
    let sorted;
    if (type === 'general') {
      sorted = Object.entries(db.users || {})
        .map(([id, u]) => ({ id, pts: u.totalPoints || 0, username: u.username || id, first: u.firstBetAt || Infinity }))
        .sort((a, b) => b.pts - a.pts || a.first - b.first).slice(0, 20);
    } else {
      const todayStr = getParisDayKey();
      const pts = {}, first = {};
      for (const [matchId, bets] of Object.entries(db.bets || {})) {
        const match = db.matches[matchId];
        if (!match || !match.result || !match.closingTimeUTC?.startsWith(todayStr)) continue;
        const winning = Array.isArray(match.result) ? match.result : [match.result];
        for (const [userId, bet] of Object.entries(bets)) {
          if (winning.includes(bet.choice)) {
            const base = { 1: 2, 2: 4, 3: 8 }[bet.choice] || 0; pts[userId] = (pts[userId] || 0) + (bet.boosted ? base * 2 : base);
            if (!first[userId] || bet.placedAt < first[userId]) first[userId] = bet.placedAt || Infinity;
          }
        }
      }
      sorted = Object.entries(pts).map(([id, p]) => ({ id, pts: p, username: db.users[id]?.username || id, first: first[id] || Infinity }))
        .sort((a, b) => b.pts - a.pts || a.first - b.first).slice(0, 20);
    }
    if (!sorted.length) return interaction.editReply('Aucun point pour le moment.');
    const medals = ['🥇', '🥈', '🥉'];
    const embed = new EmbedBuilder().setColor(0xE10014)
      .setTitle(type === 'general' ? '🏆 Classement Général' : '🗓️ Classement du Jour')
      .setDescription(sorted.map((u, i) => `${medals[i] || `**${i+1}.**`} <@${u.id}> — **${u.pts} pts**`).join('\n'))
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  },
};
