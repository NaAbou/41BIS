import discord
from discord.ext import commands
import os
import asyncio
import json
from datetime import datetime, timezone, timedelta
import requests

# Configurazione del bot
intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix='!', intents=intents)

async def fetch_players():
    data = requests.get("https://servers-frontend.fivem.net/api/servers/single/3vk49z").json().get("Data", "{}").get("players", "[]")
    messages = []
    
    now = datetime.now(timezone.utc)
    day_str = now.strftime("%Y-%m-%d")
    hour_str = now.strftime("%H")
    
    folder_path = os.path.join("login_log", day_str)
    os.makedirs(folder_path, exist_ok=True)
    file_path = os.path.join(folder_path, f"{hour_str}.json")

    for elem in data:
        for i in elem.get("identifiers", []):
            if i.startswith("discord:"):
                discordID = i.split(":", 1)[1]
                messages.append({
                    "discordID": discordID,
                    "timestamp": now.timestamp()
                })
                
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(messages, f, indent=2, ensure_ascii=False)

    print(f"💾 Salvato file: {file_path} ({len(messages)} player)")

@bot.event
async def on_ready():
    print(f'✅ Bot connesso come {bot.user.name}')

    channel_ids_json = os.getenv("CHANNEL_ID","[]") #["4141241","14124","123123"]
    channel_ids = json.loads(channel_ids_json)
    messages = []
    for cid in channel_ids:
        channel = bot.get_channel(int(cid))
        if not channel:
            print("❌ Canale non trovato!")
            return

        # Data corrente in UTC
        today = datetime.now(timezone.utc).date()
        print(f"📅 Data corrente (UTC): {today}")
        two_weeks_ago = datetime.now(timezone.utc) - timedelta(days=14)

        # Legge i messaggi solo di oggi
        
        async for message in channel.history(limit=None):#, after=two_weeks_ago):
            messages.append({
                "author": message.author.display_name,
                "content": message.clean_content,
                "timestamp": message.created_at.isoformat()
            })

        print(f'📩 Trovati {len(messages)} messaggi del {today}')

    # Salva in un file JSON
    with open("messages.json", "w", encoding="utf-8") as f:
        json.dump(messages, f, indent=2, ensure_ascii=False)
        
    await fetch_players()
    
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
