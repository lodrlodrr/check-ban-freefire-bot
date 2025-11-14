import discord
import os
from discord.ext import commands
from dotenv import load_dotenv
from flask import Flask
import threading
from utils import check_ban

app = Flask(__name__)

load_dotenv()
APPLICATION_ID = os.getenv("APPLICATION_ID")
TOKEN = os.getenv("TOKEN")
BOT_STATUS = os.getenv("BOT_STATUS", "online")  # Default to "online" if not set

# Check if TOKEN is available
if not TOKEN or TOKEN == "your_bot_token_here":
    print("ERROR: Please set a valid TOKEN in your .env file")
    exit(1)

intents = discord.Intents.default()
intents.message_content = True

# Set bot status based on .env setting
if BOT_STATUS.lower() == "idle":
    status = discord.Status.idle
elif BOT_STATUS.lower() == "dnd":
    status = discord.Status.dnd
elif BOT_STATUS.lower() == "offline":
    status = discord.Status.offline
else:
    status = discord.Status.online

bot = commands.Bot(command_prefix="!", intents=intents, status=status)

# Region mapping for full names
REGION_NAMES = {
    "ind": "India",
    "br": "Brazil",
    "sg": "Singapore",
    "ru": "Russia",
    "id": "Indonesia",
    "tw": "Taiwan",
    "us": "United States",
    "vn": "Vietnam",
    "th": "Thailand",
    "me": "Middle East",
    "pk": "Pakistan",
    "cis": "CIS",
    "bd": "Bangladesh"
}

DEFAULT_LANG = "en"
user_languages = {}

nomBot = "None"

@app.route('/')
def home():
    global nomBot
    return f"Bot {nomBot} is working"

def run_flask():
    app.run(host='0.0.0.0', port=10000)

threading.Thread(target=run_flask).start()

@bot.event
async def on_ready():
    global nomBot
    nomBot = f"{bot.user}"
    print(f"Le bot est connecté en tant que {bot.user}")

@bot.command(name="guilds")
async def show_guilds(ctx):
    guild_names = [f"{i+1}. {guild.name}" for i, guild in enumerate(bot.guilds)]
    guild_list = "\n".join(guild_names)
    await ctx.send(f"Le bot est dans les guilds suivantes :\n{guild_list}")

@bot.command(name="lang")
async def change_language(ctx, lang_code: str):
    lang_code = lang_code.lower()
    if lang_code not in ["en", "fr"]:
        await ctx.send("❌ Invalid language. Available: `en`, `fr`")
        return

    user_languages[ctx.author.id] = lang_code
    message = "✅ Language set to English." if lang_code == 'en' else "✅ Langue définie sur le français."
    await ctx.send(f"{ctx.author.mention} {message}")

@bot.command(name="check")
async def check_ban_command(ctx):
    content = ctx.message.content
    user_id = content[6:].strip()  # Changed from 3 to 6 to account for "!check" length
    lang = user_languages.get(ctx.author.id, "en")

    print(f"Commande fait par {ctx.author} (lang={lang})")

    if not user_id.isdigit():
        message = {
            "en": f"{ctx.author.mention} ❌ **Invalid UID!**\n➡️ Please use: `!check 123456789`",
            "fr": f"{ctx.author.mention} ❌ **UID invalide !**\n➡️ Veuillez fournir un UID valide sous la forme : `!check 123456789`"
        }
        await ctx.send(message[lang])
        return

    async with ctx.typing():
        try:
            ban_status = await check_ban(user_id)
        except Exception as e:
            await ctx.send(f"{ctx.author.mention} ⚠️ Error:\n```{str(e)}```")
            return

        if ban_status is None:
            message = {
                "en": f"{ctx.author.mention} ❌ **Could not get information. Please try again later.**",
                "fr": f"{ctx.author.mention} ❌ **Impossible d'obtenir les informations.**\nVeuillez réessayer plus tard."
            }
            await ctx.send(message[lang])
            return
        elif isinstance(ban_status, dict) and ban_status.get("error") == "API_SERVICE_DOWN":
            message = {
                "en": f"{ctx.author.mention} ❌ **The ban check service is currently unavailable.**\nPlease try again later when the service is restored.",
                "fr": f"{ctx.author.mention} ❌ **Le service de vérification des bannissements est actuellement indisponible.**\nVeuillez réessayer plus tard lorsque le service sera rétabli."
            }
            await ctx.send(message[lang])
            return
        elif isinstance(ban_status, dict) and ban_status.get("error") == "API_SERVER_ERROR":
            message = {
                "en": f"{ctx.author.mention} ❌ **The ban check service is experiencing technical issues.**\nPlease try again later.",
                "fr": f"{ctx.author.mention} ❌ **Le service de vérification des bannissements rencontre des problèmes techniques.**\nVeuillez réessayer plus tard."
            }
            await ctx.send(message[lang])
            return
        elif isinstance(ban_status, dict) and ban_status.get("error") == "API_FORBIDDEN":
            message = {
                "en": f"{ctx.author.mention} ❌ **Access to the ban check service was denied.**\nThis may be due to invalid credentials or rate limiting.",
                "fr": f"{ctx.author.mention} ❌ **L'accès au service de vérification des bannissements a été refusé.**\nCela peut être dû à des identifiants invalides ou à une limitation de débit."
            }
            await ctx.send(message[lang])
            return
        elif isinstance(ban_status, dict) and ban_status.get("error") == "API_DATA_ERROR":
            message = {
                "en": f"{ctx.author.mention} ❌ **The ban check service returned unexpected data.**\nPlease try again later.",
                "fr": f"{ctx.author.mention} ❌ **Le service de vérification des bannissements a renvoyé des données inattendues.**\nVeuillez réessayer plus tard."
            }
            await ctx.send(message[lang])
            return
        elif isinstance(ban_status, dict) and ban_status.get("error") == "EXCEPTION":
            message = {
                "en": f"{ctx.author.mention} ❌ **An error occurred while checking the ban status.**\nDetails: {ban_status.get('message', 'Unknown error')}",
                "fr": f"{ctx.author.mention} ❌ **Une erreur s'est produite lors de la vérification du statut de bannissement.**\nDétails: {ban_status.get('message', 'Erreur inconnue')}"
            }
            await ctx.send(message[lang])
            return
        elif isinstance(ban_status, dict) and ban_status.get("error") == "ACCOUNT_NOT_FOUND":
            message = {
                "en": f"{ctx.author.mention} ❌ **Account not found in any Free Fire region.**\nPlease verify the Player ID is correct.",
                "fr": f"{ctx.author.mention} ❌ **Compte introuvable dans toutes les régions Free Fire.**\nVeuillez vérifier que l'ID du joueur est correct."
            }
            await ctx.send(message[lang])
            return
        elif isinstance(ban_status, dict) and ban_status.get("error"):
            # Handle any other API errors
            error_msg = ban_status.get("message", "Unknown API error")
            message = {
                "en": f"{ctx.author.mention} ❌ **API Error:** {error_msg}",
                "fr": f"{ctx.author.mention} ❌ **Erreur API:** {error_msg}"
            }
            await ctx.send(message[lang])
            return

        is_banned = int(ban_status.get("is_banned", 0))
        period = ban_status.get("period", "N/A")
        nickname = ban_status.get("nickname", "NA")
        region_code = ban_status.get("region", "N/A")
        region_name = REGION_NAMES.get(region_code, region_code)
        
        # Get additional account info if available
        created_at = ban_status.get("created_at", "N/A")
        last_login = ban_status.get("last_login", "N/A")
        
        id_str = f"`{user_id}`"

        if isinstance(period, int):
            period_str = f"more than {period} months" if lang == "en" else f"plus de {period} mois"
        else:
            period_str = "unavailable" if lang == "en" else "indisponible"

        embed = discord.Embed(
            color=0xFF0000 if is_banned else 0x00FF00,
            timestamp=ctx.message.created_at
        )

        if is_banned:
            embed.title = "**> Banned Account <:crossmark:1423012536353292380> **" if lang == "en" else "**▌ Compte banni 🛑 **"
            embed.description = (
                f"**• {'Reason' if lang == 'en' else 'Raison'} :** "
                f"{'This account was confirmed for using cheats.' if lang == 'en' else 'Ce compte a été confirmé comme utilisant des hacks.'}\n"
                f"**• {'Suspension duration' if lang == 'en' else 'Durée de la suspension'} :** {period_str}\n"
                f"**• {'Nickname' if lang == 'en' else 'Pseudo'} :** `{nickname}`\n"
                f"**• {'Player ID' if lang == 'en' else 'ID du joueur'} :** `{id_str}`\n"
                f"**• {'Region' if lang == 'en' else 'Région'} :** `{region_name}`"
            )
            if created_at != "N/A":
                embed.description += f"\n**• {'Created At' if lang == 'en' else 'Créé le'} :** `{created_at}`"
            if last_login != "N/A":
                embed.description += f"\n**• {'Last Login' if lang == 'en' else 'Dernière connexion'} :** `{last_login}`"
            embed.set_image(url="https://i.ibb.co/wFxTy8TZ/banned.gif")
        else:
            embed.title = "**> Clean Account <:tickmark:1423012532104204449> **" if lang == "en" else "**▌ Compte non banni ✅ **"
            embed.description = (
                f"**• {'Status' if lang == 'en' else 'Statut'} :** "
                f"{'No sufficient evidence of cheat usage on this account.' if lang == 'en' else 'Aucune preuve suffisante pour confirmer l’utilisation de hacks sur ce compte.'}\n"
                f"**• {'Nickname' if lang == 'en' else 'Pseudo'} :** `{nickname}`\n"
                f"**• {'Player ID' if lang == 'en' else 'ID du joueur'} :** `{id_str}`\n"
                f"**• {'Region' if lang == 'en' else 'Région'} :** `{region_name}`"
            )
            if created_at != "N/A":
                embed.description += f"\n**• {'Created At' if lang == 'en' else 'Créé le'} :** `{created_at}`"
            if last_login != "N/A":
                embed.description += f"\n**• {'Last Login' if lang == 'en' else 'Dernière connexion'} :** `{last_login}`"
            embed.set_image(url="https://i.ibb.co/Kx1RYVKZ/notbanned.gif")

        embed.set_thumbnail(url=ctx.author.avatar.url if ctx.author.avatar else ctx.author.default_avatar.url)
        embed.set_footer(text="📌  Garena Free Fire")
        await ctx.send(f"{ctx.author.mention}", embed=embed)

bot.run(TOKEN)