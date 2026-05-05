# Discoords

A Discord bot for storing Minecraft coordinates in a persistent and updating embedded message. Built in Node using [discord.js](https://discord.js.org/) with SQLite for the database.

## Commands

```mcfunction
/coord setup # initial bot setup in channel
/coord add {x} {z} {description} # add coordinate
/coord delete {id} # delete coordinate
/coord update {id} {x?} {z?} {description?} # update coordinate
/coord refresh # refresh embedded message
```

## Setup

Create a Discord bot in the [Discord Developer Portal](https://discord.com/developers/home). You can find `DISCORD_TOKEN` and `CLIENT_ID` in this dashboard under 'Bot' and 'OAuth', respectively.

Your `.env` file should contain:

```env
DISCORD_TOKEN=...
CLIENT_ID=...
GUILD_ID=... # discord server id (enable developer mode)
```

To invite the bot to your server, navigate to OAuth -> URL Generator. Under scopes, select:

- bot
- applications.commands

Then grant the following permissions before generating the invite URL:

- View Channels
- Send Messages
- Embed Links
- Read Message History
- Manage Messages

Then, run the following commands to start the bot:

```bash
npm install
npm run commands # only necessary if first time running

npm start
```
