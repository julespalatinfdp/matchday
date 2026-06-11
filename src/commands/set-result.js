const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { load, save } = require('../db');
const { buildMatchEmbed, buildButtons } = require('../matchEmbed');
const BASE_POINTS = { 1: 2, 2: 4, 3: 8 };
module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-result')
    .setDescription('Définir le(s) résultat(s) d\'un match et attribuer les points')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o => o.setName('match_id').setDescription('ID du match').setRequired(true))
    .addBooleanOption(o => o.setName('choix1').setDescription('Choix 1 est gagnant ?').setRequired(false))
    .addBooleanOption(o => o.setName('choix2').setDescription('Choix 2 est gagnant ?').setRequired(false))
    .addBooleanOption(o => o.setName('choix3').setDescription('Choix 3 est gagnant ?').setRequired(false)),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const matchId = interaction.options.getString('match_id');
    const winningChoices = [];
    if (interaction.options.getBoolean('choix1')) winningChoices.push(1);
    if (interaction.options.getBoolean('choix2')) winningChoices.push(2);
    if (interaction.options.getBoolean('choix3')) winningChoices.push(3);
    if (winningChoices.length === 0) return interaction.editReply('❌ Sélectionne au moins un choix gagnant.');
    const db = load();
    const matchData = db.matches[matchId];
    if (!matchData) return interaction.editReply('❌ Match introuvable.');
    if (matchData.result !== undefined) return interaction.editReply('❌ Ce match a déjà un résultat.');
    matchData.result = winningChoices;
    matchData.status = 'closed';
    const bets = db.bets[matchId] || {};
    let winners = 0;
    for (const [userId, bet] of Object.entries(bets)) {
      if (winningChoices.includes(bet.choice)) {
        const pts = bet.boosted ? BASE_POINTS[bet.choice] * 2 : BASE_POINTS[bet.choice];
        if (!db.users[userId]) db.users[userId] = { totalPoints: 0, username: bet.username || userId };
        db.users[userId].totalPoints = (db.users[userId].totalPoints || 0) + pts;
        bet.points = pts;
        winners++;
      }
    }
    save(db);
    try {
      const channel = await interaction.guild.channels.fetch(matchData.channelId);
      const msg = await channel.messages.fetch(matchData.messageId);
      await msg.edit({ embeds: [buildMatchEmbed(matchData)], components: [buildButtons(matchId, false)] });
    } catch (e) { console.error('[set-result]', e.message); }
    const labels = winningChoices.map(c => `Choix ${c} (${BASE_POINTS[c]} pts)`).join(', ');
    await interaction.editReply(`✅ Résultat enregistré.\nGagnant(s) : **${labels}**\n${winners} membre(s) crédité(s).`);
  },
};
