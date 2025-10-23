import discord
from discord.ext import commands
import os
import asyncio
import json
from datetime import datetime, timezone, timedelta


# Configurazione del bot
intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix='!', intents=intents)

@bot.event
async def on_ready():
    print(f'✅ Bot connesso come {bot.user.name}')

    channel_id = int(os.getenv("CHANNEL_ID"))
    channel = bot.get_channel(channel_id)
    if not channel:
        print("❌ Canale non trovato!")
        return

    # Data corrente in UTC
    today = datetime.now(timezone.utc).date()
    print(f"📅 Data corrente (UTC): {today}")
    two_weeks_ago = datetime.now(timezone.utc) - timedelta(days=14)

    # Legge i messaggi solo di oggi
    messages = []
    async for message in channel.history(limit=None):#, after=two_weeks_ago):
        messages.append({
            "author": bot.fetch_user(str(message.author)),
            "content": message.clean_content,
            "timestamp": message.created_at.isoformat()
        })

    print(f'📩 Trovati {len(messages)} messaggi del {today}')

    # Salva in un file JSON
    with open("messages.json", "w", encoding="utf-8") as f:
        json.dump(messages, f, indent=2, ensure_ascii=False)

    # Chiude il bot dopo 5 secondi (utile per GitHub Actions)
    await asyncio.sleep(5)
    await bot.close()

# Avvia il bot
if __name__ == '__main__':
    token = os.getenv('DISCORD_TOKEN')
    if not token:
        raise ValueError('❌ DISCORD_TOKEN non trovato nelle variabili d\'ambiente!')
    
    try:
        bot.run(token)
    except Exception as e:
        print(f'❌ Errore durante l\'esecuzione del bot: {e}')
        exit(1)