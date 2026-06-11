require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { load, save } = require('./db');
const { buildMatchEmbed, buildButtons } = require('./matchEmbed');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.commands = new Collection();
const cmdDir = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(cmdDir).filter(f => f.endsWith('.js'))) {
  const cmd = require(path.join(cmdDir, file));
  client.commands.set(cmd.data.name, cmd);
}

client.once('ready', () => {
  console.log(`✅ Bot connecté : ${client.user.tag}`);
  startAutoCloseJob();
});

client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    const cmd = client.commands.get(interaction.commandName);
    if (!cmd) return;
    try { await cmd.execute(interaction); }
    catch (e) {
      console.error(e);
      const r = { content: '❌ Erreur.', ephemeral: true };
      interaction.deferred || interaction.replied ? interaction.editReply(r) : interaction.reply(r);
    }
    return;
  }

  if (interaction.isButton() && interaction.customId.startsWith('bet_')) {
    const parts = interaction.customId.split('_');
    const choice = parseInt(parts[parts.length - 1], 10);
    const matchId = parts.slice(1, -1).join('_');
    const db = load();
    const match = db.matches[matchId];
    if (!match) return interaction.reply({ content: '❌ Match introuvable.', ephemeral: true });
    if (match.status !== 'open') return interaction.reply({ content: '❌ Mises fermées.', ephemeral: true });
    const userId = interaction.user.id;
    const username = interaction.user.username;
    const alreadyBet = !!db.bets[matchId]?.[userId];
    const labels = { 1: match.choice1Label, 2: match.choice2Label, 3: match.choice3Label };
    const pts = { 1: 2, 2: 4, 3: 8 }[choice];
    if (!db.users[userId]) db.users[userId] = { totalPoints: 0, username };
    db.users[userId].username = username;
    if (!db.bets[matchId]) db.bets[matchId] = {};
    db.bets[matchId][userId] = { choice, username, points: null, placedAt: Date.now() };
    save(db);
    return interaction.reply({
      embeds: [{ color: 0x00C853, title: alreadyBet ? '🔄 Pari modifié !' : '✅ Pari enregistré !',
        description: `**Match :** ${match.title}\n**Choix :** ${labels[choice]}\n**Points potentiels :** ${pts} pts`,
        footer: { text: 'Tu peux changer ton pari tant que les mises sont ouvertes.' } }],
      ephemeral: true,
    });
  }
});

function startAutoCloseJob() {
  cron.schedule('* * * * *', async () => {
    const now = new Date(); const db = load(); let changed = false;
    for (const [matchId, match] of Object.entries(db.matches)) {
      if (match.status !== 'open') continue;
      if (now >= new Date(match.closingTimeUTC)) {
        match.status = 'closed'; changed = true;
        console.log(`[AutoClose] ${matchId}`);
        try {
          const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
          const channel = await guild.channels.fetch(match.channelId);
          const msg = await channel.messages.fetch(match.messageId);
          await msg.edit({ embeds: [buildMatchEmbed(match)], components: [buildButtons(matchId, false)] });
        } catch (e) { console.error('[AutoClose]', e.message); }
      }
    }
    if (changed) save(db);
  });
}

client.login(process.env.DISCORD_TOKEN);
