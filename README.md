# c0den4mes

A real-time multiplayer word game inspired by Codenames, built for playing with friends online. Create a room, share the code, pick teams, and try to guess your team's words before time runs out — without accidentally picking the assassin word.

🔗 Live at [c0den4mes.com](https://c0den4mes.com)

## What is this?

Codenames is a word-guessing party game. Two teams (red and blue) each have a "spymaster" who can see which words belong to their team, and "operatives" who can't. The spymaster gives one-word clues and a number, and the operatives try to guess the right words on the board without touching the other team's words or the assassin word, which ends the game instantly.

This project brings that game online so people can play together in real time from anywhere, without needing to be in the same room or buy a physical copy.

## How the game works

- Anyone can create a room and gets a short room code to share with friends
- Players join using that code, pick a team (red or blue), and choose to be either a spymaster or an operative
- Once the host starts the game, roles are locked — no switching mid-game. This was a deliberate design choice to prevent cheating, since in most online versions of this game people can just toggle their view to see the answers
- The board is a 5x5 grid of 25 words. Spymasters see the color of every word; operatives only see what's been revealed so far
- Teams take turns giving clues and guessing, with a timer to keep the game moving
- First team to find all their words wins (unless someone hits the assassin word first)

## Why I built it this way

The biggest technical challenge with an online Codenames clone is preventing cheating. A lot of clone sites just hide the answer with CSS or a toggle button, which means anyone who opens their browser's dev tools can see every color on the board.

To avoid that, the server never sends color data to a player unless they're actually the spymaster. The game logic checks each player's role in the database before deciding what to send back, so even inspecting the network traffic in a browser won't reveal anything useful. Once a game starts, a timestamp gets saved that locks every player's role for the rest of that game, so there's no way to switch sides or roles partway through.

## Tech stack

**Next.js** — this is the framework the whole site is built on. It handles both the pages people see (the home screen, the lobby, the game board) and the server-side logic that runs behind the scenes (starting a game, checking if a guess is correct, locking roles). Having both in one place keeps things simple.

**Supabase** — this is the database, and it's doing a few different jobs:
- *Postgres database* — stores everything: games, players, the word cards, word packs, accounts. A relational SQL database made sense here because all this data is connected — a game has many players, a game has many cards, a player belongs to one game at a time, and so on. Being able to query across those relationships easily was important.
- *Realtime* — this is what makes the multiplayer part actually feel live. When one player picks a team or reveals a card, everyone else in the room sees it update instantly through a live connection, without refreshing the page.
- *Auth* — handles account creation and login, including password resets, without me ever having to touch or store anyone's actual password.

**Vercel** — this is where the site actually lives on the internet. Every time code gets pushed to GitHub, it automatically rebuilds and deploys the latest version. It also handles routing traffic to the right place and serving the site fast no matter where someone's connecting from.

**Tailwind CSS** — used for styling. Instead of writing separate CSS files, styling gets written directly alongside the layout code, which made it faster to build and tweak the look of things like the game board and team colors.

**TypeScript** — the site is written in TypeScript rather than plain JavaScript, which catches a lot of small mistakes (like typos in variable names or passing the wrong type of data) before the site even runs.

## The database

There are five main tables:

- **games** — one row per game room. Tracks the room code, whether the game is in the lobby or actively being played, whose turn it is, and how many words each team has left
- **game_players** — one row per person in a game. Tracks their name, team, role, and the timestamp that locks their role once the game starts
- **cards** — the 25 words on the board for a given game, their color, and whether they've been revealed yet
- **word_packs** — collections of words that can be used to generate a board. Right now there's a default set, with the idea of letting people upload their own later
- **user_stats** — tracks wins and games played for anyone with an account

Security on the database is handled with row-level security policies, which control exactly what data anyone is allowed to read or change directly, separate from whatever the application code allows.

## Status

The core game is playable — room creation, joining, team/role selection, the live board, and turn-based guessing all work. Still being added: persistent accounts with saved stats, custom word pack uploads, and a chat/reaction system for players during games.
