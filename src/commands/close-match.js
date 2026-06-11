const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { load, save } = require('../db');
const { buildMatchEmbed, buildButtons } = require('../matchEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close-match')
    .setDescription('Fermer manuellement un pari')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o => o.setName('match_id').setDescription('ID du match').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const matchId = interaction.options.getString('match_id');
    const db = load();
    const match = db.matches[matchId];

    if (!match) return interaction.editReply('❌ Match introuvable.');
    if (match.status === 'closed') return interaction.editReply('❌ Ce match est déjà fermé.');

    match.status = 'closed';
    save(db);

    try {
      const channel = await interaction.guild.channels.fetch(match.channelId);
      const msg     = await channel.messages.fetch(match.messageId);
      await msg.edit({ embeds: [buildMatchEmbed(match)], components: [buildButtons(matchId, false)] });
    } catch (e) { console.error('[close-match]', e.message); }

    await interaction.editReply(`✅ Match \`${matchId}\` fermé manuellement.`);
  },
};
