import discord
from discord.ext import commands
import os
import asyncio
import json
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
import requests
import firebase_admin
from firebase_admin import credentials, firestore


firebase_creds = json.loads(os.getenv("FIREBASE_CREDENTIALS", "{}"))
cred = credentials.Certificate(firebase_creds)
firebase_admin.initialize_app(cred)
db = firestore.client()

# Configurazione del bot
intents = discord.Intents.default()
intents.message_content = True
intents.members = True

bot = commands.Bot(command_prefix='!', intents=intents)


async def fetch_players():
    data = requests.get("https://servers-frontend.fivem.net/api/servers/single/zyrbxy").json().get("Data", "{}").get("players", "[]")
    messages = []
    
    now = datetime.now(ZoneInfo("Europe/Rome"))
    day_str = now.strftime("%Y-%m-%d")
    hour_str = now.strftime("%H")
    
    folder_path = os.path.join("login_log", day_str)
    os.makedirs(folder_path, exist_ok=True)
    file_path = os.path.join(folder_path, f"{hour_str}.json")

    for elem in data:
        messages.append({
            "discordID": elem.get("name", ""),
            "timestamp": now.timestamp()
        })
                
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(messages, f, indent=2, ensure_ascii=False)

    print(f"💾 Salvato file: {file_path} ({len(messages)} player)")

async def get_ds_members(guild):
    target_roles = {"informativa", "braccio"}
    filtered_members = []

    async for member in guild.fetch_members(limit=None):
        if member.bot:
            continue

        member_role_names = [role.name.lower() for role in member.roles]
        matching_roles = [r for r in member_role_names if r in target_roles]

        if matching_roles:
            filtered_members.append({
                "name": member.display_name,
                "username": member.name,
                "discordId": str(member.id),
                "roles": matching_roles,
                "wl": "no",
                "hours": 0,
                "lastLogin": ""
            })

    print(f"🛡️ Trovati {len(filtered_members)} membri con ruolo Braccio/Informativa")
    return filtered_members

def sync_members_to_firestore(members):
    collection_ref = db.collection("members")
    batch = db.batch()
    count = 0

    for member in members:
        doc_ref = collection_ref.document(member["discordId"])
        doc = doc_ref.get()

        if doc.exists:
            # Aggiorna solo i campi "live" senza toccare wl/hours/lastLogin
            batch.update(doc_ref, {
                "name": member["name"],
                "username": member["username"],
                "roles": member["roles"],
                "updatedAt": firestore.SERVER_TIMESTAMP,
            })
        else:
            # Primo inserimento: scrivi tutto
            batch.set(doc_ref, {
                "name": member["name"],
                "username": member["username"],
                "discordId": member["discordId"],
                "roles": member["roles"],
                "wl": "no",
                "hours": 0,
                "lastLogin": "",
                "createdAt": firestore.SERVER_TIMESTAMP,
                "updatedAt": firestore.SERVER_TIMESTAMP,
            })

        count += 1

        # Firestore batch limit = 500
        if count % 450 == 0:
            batch.commit()
            batch = db.batch()
            print(f"  ✅ Committati {count} documenti...")

    batch.commit()
    print(f"🔥 Firestore: sincronizzati {count} membri")
    

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
    
    guild = bot.guilds[0] if bot.guilds else None
    if guild:
        members = await get_ds_members(guild)
        sync_members_to_firestore(members)
    else:
        print("❌ Nessun guild trovato!")

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
