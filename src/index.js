// src/index.js
require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Collection,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const cron = require('node-cron');
const fs   = require('fs');
const path = require('path');
const { load, save } = require('./db');
const { buildMatchEmbed, buildButtons } = require('./matchEmbed');

// ─── Client ───────────────────────────────────────────────────────────────────
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

// ─── Commandes ────────────────────────────────────────────────────────────────
client.commands = new Collection();
const cmdDir = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(cmdDir).filter(f => f.endsWith('.js'))) {
  const cmd = require(path.join(cmdDir, file));
  client.commands.set(cmd.data.name, cmd);
}

// ─── Ready ────────────────────────────────────────────────────────────────────
client.once('ready', () => {
  console.log(`✅ Bot connecté : ${client.user.tag}`);
  startAutoCloseJob();
});

// ─── Interactions ─────────────────────────────────────────────────────────────
client.on('interactionCreate', async interaction => {
  // Slash commands
  if (interaction.isChatInputCommand()) {
    const cmd = client.commands.get(interaction.commandName);
    if (!cmd) return;
    try { await cmd.execute(interaction); }
    catch (e) {
      console.error(e);
      const reply = { content: '❌ Erreur lors de l\'exécution.', ephemeral: true };
      if (interaction.deferred || interaction.replied) interaction.editReply(reply);
      else interaction.reply(reply);
    }
    return;
  }

  // Boutons de paris
  if (interaction.isButton()) {
    const [prefix, matchId, choiceStr] = interaction.customId.split('_');
    if (prefix !== 'bet') return;

    const choice = parseInt(choiceStr, 10);
    const db     = load();
    const match  = db.matches[matchId];

    if (!match) return interaction.reply({ content: '❌ Match introuvable.', ephemeral: true });
    if (match.status !== 'open') return interaction.reply({ content: '❌ Les mises sont fermées.', ephemeral: true });

    const userId   = interaction.user.id;
    const username = interaction.user.username;

    // Initialise l'utilisateur
    if (!db.users[userId]) db.users[userId] = { totalPoints: 0, boostUsedToday: null, username };
    db.users[userId].username = username; // mise à jour du pseudo

    // Vérifier si déjà parié sur ce match
    const existingBet = db.bets[matchId]?.[userId];
    const alreadyBet  = !!existingBet;

    // Est-ce que le boost est disponible aujourd'hui ?
    const todayStr = new Date().toISOString().slice(0, 10);
    const boostAvailable = db.users[userId].boostUsedToday !== todayStr;

    // Bouton boost séparé pour confirmer
    await interaction.reply({
      embeds: [{
        color: 0xE10014,
        title: alreadyBet
          ? `🔄 Modifier ton pari — ${match.title}`
          : `🎲 Confirmer ton pari — ${match.title}`,
        description:
          `Tu as choisi : **${getChoiceLabel(match, choice)}**\n\n` +
          (boostAvailable
            ? '⚡ **Tu as un boost disponible aujourd\'hui !**\nActivate-le pour **doubler tes points** sur ce pari.\n*(1 boost par jour, sur 1 seul match)*'
            : '❌ Tu as déjà utilisé ton boost aujourd\'hui.'),
        footer: { text: alreadyBet ? 'Ton ancien pari sera remplacé.' : '' },
      }],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`confirm_${matchId}_${choice}_0`)
            .setLabel('✅ Confirmer')
            .setStyle(ButtonStyle.Success),
          ...(boostAvailable ? [
            new ButtonBuilder()
              .setCustomId(`confirm_${matchId}_${choice}_1`)
              .setLabel('⚡ Confirmer + Boost ×2')
              .setStyle(ButtonStyle.Primary),
          ] : []),
          new ButtonBuilder()
            .setCustomId('cancel_bet')
            .setLabel('Annuler')
            .setStyle(ButtonStyle.Secondary),
        ),
      ],
      ephemeral: true,
    });
  }

  // Confirmation du pari
  if (interaction.isButton() && interaction.customId.startsWith('confirm_')) {
    const parts   = interaction.customId.split('_');
    const matchId = parts[1];
    const choice  = parseInt(parts[2], 10);
    const boost   = parts[3] === '1';

    const db    = load();
    const match = db.matches[matchId];

    if (!match || match.status !== 'open') {
      return interaction.reply({ content: '❌ Match fermé.', ephemeral: true });
    }

    const userId   = interaction.user.id;
    const username = interaction.user.username;
    const todayStr = new Date().toISOString().slice(0, 10);

    if (!db.users[userId]) db.users[userId] = { totalPoints: 0, boostUsedToday: null, username };

    // Vérifier boost (double check côté serveur)
    if (boost && db.users[userId].boostUsedToday === todayStr) {
      return interaction.reply({ content: '❌ Tu as déjà utilisé ton boost aujourd\'hui.', ephemeral: true });
    }

    if (!db.bets[matchId]) db.bets[matchId] = {};
    db.bets[matchId][userId] = { choice, boosted: boost, username, points: null };

    if (boost) db.users[userId].boostUsedToday = todayStr;
    db.users[userId].username = username;

    save(db);

    const basePoints = { 1: 2, 2: 4, 3: 8 }[choice];
    const finalPoints = boost ? basePoints * 2 : basePoints;

    await interaction.update({
      embeds: [{
        color: 0x00C853,
        title: '✅ Pari enregistré !',
        description:
          `**Match :** ${match.title}\n` +
          `**Choix :** ${getChoiceLabel(match, choice)}\n` +
          `**Points potentiels :** ${finalPoints} pts${boost ? ' ⚡ (boost ×2 activé)' : ''}`,
        footer: { text: 'Tu peux changer ton pari tant que les mises sont ouvertes.' },
      }],
      components: [],
    });
  }

  // Annulation
  if (interaction.isButton() && interaction.customId === 'cancel_bet') {
    await interaction.update({ content: 'Pari annulé.', embeds: [], components: [] });
  }
});

// ─── Fermeture automatique (vérifie toutes les minutes) ──────────────────────
function startAutoCloseJob() {
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    const db  = load();
    let changed = false;

    for (const [matchId, match] of Object.entries(db.matches)) {
      if (match.status !== 'open') continue;

      const closing = new Date(match.closingTimeUTC);
      if (now >= closing) {
        match.status = 'closed';
        changed = true;
        console.log(`[AutoClose] Fermeture du match ${matchId}`);

        // Mettre à jour le message Discord
        try {
          const guild   = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
          const channel = await guild.channels.fetch(match.channelId);
          const msg     = await channel.messages.fetch(match.messageId);
          const embed   = buildMatchEmbed(match);
          const row     = buildButtons(matchId, false);
          await msg.edit({ embeds: [embed], components: [row] });
        } catch (e) {
          console.error('[AutoClose] Impossible de mettre à jour le message:', e.message);
        }
      }
    }

    if (changed) save(db);
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getChoiceLabel(match, choice) {
  return {
    1: match.choice1Label,
    2: match.choice2Label,
    3: match.choice3Label,
  }[choice] || `Choix ${choice}`;
}

// ─── Login ────────────────────────────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN);
