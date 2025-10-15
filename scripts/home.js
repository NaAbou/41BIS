import {signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js'
import { auth } from "./firebase-config.js";


const fs = require("fs");
const { Client, GatewayIntentBits } = require("discord.js");

const BOT_TOKEN = "YOUR_BOT_TOKEN";
const CHANNEL_ID = "CHANNEL_ID_TO_EXPORT";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // required for reading message content
  ],
});

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const channel = await client.channels.fetch(CHANNEL_ID);
  if (!channel.isTextBased()) {
    console.error("Channel is not text-based");
    process.exit(1);
  }

  let allMessages = [];
  let lastId;

  while (true) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;

    const messages = await channel.messages.fetch(options);
    if (messages.size === 0) break;

    messages.forEach(msg => {
      allMessages.push({
        id: msg.id,
        author: `${msg.author.tag}`,
        authorId: msg.author.id,
        content: msg.content,
        createdAt: msg.createdAt,
        attachments: msg.attachments.map(a => a.url),
        embeds: msg.embeds.map(e => e.toJSON()),
      });
    });

    lastId = messages.last().id;
    console.log(`Fetched ${allMessages.length} messages so far...`);
  }

  fs.writeFileSync(`channel_${CHANNEL_ID}.json`, JSON.stringify(allMessages, null, 2));
  console.log(`Export complete! Total messages: ${allMessages.length}`);
  client.destroy();
});

client.login(BOT_TOKEN);




onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "index.html";
    }
});