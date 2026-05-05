# Discoords

A Discord app for storing Minecraft coordinates in a persistent and updating embed. Built in Node using Discord.js with SQLite for the database.

## Commands

```python
/coord setup
/coord add {x} {y} {z} {description}
/coord delete {id}
/coord update
```

## Setup

Create a Discord bot in the developer portal and invite it to your server. You can find `DISCORD_TOKEN` and `CLIENT_ID` in this dashboard.

Your .env file should look like so

```python
DISCORD_TOKEN=...
CLIENT_ID=...
GUILD_ID=... # server id
```

Then, run the following commands to start the bot

```bash
npm run commands
npm start
```
