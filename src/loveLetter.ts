import * as Discord from "discord.js";

export async function LoveLetter(gameQueue: Discord.User[], message: Discord.Message) {
    const deck = new Deck();
    deck.shuffle();

    console.log("LOVE LETTER!!!");

    // initialize a player array
    const players: Player[] = [];
    for (const user of gameQueue) {
        players.push(new Player(user, deck.draw()));
    }

    const burn = deck.draw();

    // Game loop (while loop to be replaced by gameLoop function )
    gameLoop(message, deck, players);
}

async function gameLoop(message: Discord.Message, deck: Deck, players: Player[]) {
    if (!deck.isEmpty() && players.length > 1) {
        const newCard = deck.draw();
        const player = players.at(0);

        // put the current player at the end of the list for next turn
        players.push(players.shift());

        message.channel.send({ content: player.getUsername() + "'s Turn!\n\nThey're thinking about their next move..." });

        // handles the player's next move in DMs
        const dm = await player.createDM();
        const dmMessage = await dm.send({
            content:
                "You drew the " +
                numToCard(newCard) +
                "!\n\nReact '🟥' to play the " +
                numToCard(player.getCard()) +
                "\n\nReact '🟩' to play the " +
                numToCard(newCard),
        });
        dmMessage.react("🟥");
        dmMessage.react("🟩");

        const oldCardFilter = (reaction, user) => {
            return reaction.emoji.name === "🟥" && !user.bot;
        };

        const newCardFilter = (reaction, user) => {
            return reaction.emoji.name === "🟩" && !user.bot;
        };

        const oldCardCollector = dmMessage.createReactionCollector({ filter: oldCardFilter, time: 120000 });
        const newCardCollector = dmMessage.createReactionCollector({ filter: newCardFilter, time: 120000 });

        oldCardCollector.on("collect", async (reaction, user) => {
            console.log("COLLECTED OLD CARD!!!!");
            player.playCard(player.getCard(), newCard, message, dm, players, deck);
            newCardCollector.stop();
            oldCardCollector.stop();
        });

        newCardCollector.on("collect", async (reaction, user) => {
            console.log("COLLECTED NEW CARD!!!!");
            player.playCard(newCard, player.getCard(), message, dm, players, deck);
            newCardCollector.stop();
            oldCardCollector.stop();
        });
    }
}

async function chooseTarget(players: Player[], dm: Discord.DMChannel, card: number, message: Discord.Message, deck: Deck) {
    let targetStr = "";
    const emojiArr = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣"]; // this assumes a max of 6 players, which is maybe not the best :/
    let numTargets = 0;
    const emojiToPlayer = new Map<string, Player>();

    // TODO: Add the player playing the card if they're playing a prince & error check for if there isn't anyone in the possible targets
    for (let i = 1; i < players.length; i++) {
        if (!players.at(i).hasHandmaid()) {
            targetStr += "\n" + emojiArr.at(numTargets) + ": " + players.at(i).getUsername();
            emojiToPlayer.set(emojiArr.at(numTargets), players.at(i));
            numTargets++;
        }
    }

    const dmMessage = await dm.send({ content: "Who do you want to use the " + numToCard(card) + " on?\n" + targetStr });

    for (let i = 0; i < numTargets; i++) {
        dmMessage.react(emojiArr.at(i));
    }

    // setup collectors for each reaction in the most unreadable way possible.
    let filterArr = [];
    let collectorArr = [];
    for (let i = 0; i < numTargets; i++) {
        filterArr.push((reaction, user) => {
            return reaction.emoji.name === emojiArr.at(i) && !user.bot;
        });

        collectorArr.push(dmMessage.createReactionCollector({ filter: filterArr.at(i) }));
    }

    // run the collectors for all of the
    for (let i = 0; i < numTargets; i++) {
        collectorArr.at(i).on("collect", async (reaction, user) => {
            // do the corresponding action for card
            offensiveAction(card, emojiToPlayer.get(emojiArr.at(i)), dm, players, message, deck);

            // stop all the running collectors
            collectorArr.forEach((collector) => {
                collector.stop();
            });
        });
    }
}

function offensiveAction(card: number, target: Player, dm: Discord.DMChannel, players: Player[], message: Discord.Message, deck: Deck) {
    const currentPlayer = getCurrentPlayer(players, dm);
    switch (card) {
        case 1:
            // create another dm with the 9 options for what you can guess

            gameLoop(message, deck, players);
            break;
        case 2:
            // dm the person who played the card what the target had.

            gameLoop(message, deck, players);
            break;
        case 3:
            // message the server that a baron is happening & who the loser is

            gameLoop(message, deck, players);
            break;
        case 5:
            // message the server that the player is discarding & what that card is, then DM that player what their new card is

            gameLoop(message, deck, players);
            break;
        case 7:
            // message the server that 2 players are swapping hands, and DM both players their new cards.

            // swap hands
            const temp = currentPlayer.getCard();
            currentPlayer.setCard(target.getCard());
            target.setCard(temp);

            gameLoop(message, deck, players);
            break;
        default:
            console.error("Inoffensive card treated as offensive");
            break;
    }
}

function getCurrentPlayer(players: Player[], dm: Discord.DMChannel) {
    for (const player of players) {
        if (dm.recipient.username === player.getUsername()) {
            return player;
        }
    }
}

class Game {
    private deck: Deck;
    private players: Player[];
    private message: Discord.Message; // to get the channel the game was started in

    constructor(gameQueue: Discord.User[], message: Discord.Message) {
        this.deck = new Deck();
        this.deck.shuffle();

        // fill the players array with the users in gameQueue
        this.players = [];
        for (const user of gameQueue) {
            this.players.push(new Player(user, this.deck.draw()));
        }

        this.message = message;
    }

    public getDeck() {
        return this.deck;
    }

    public getPlayers() {
        return this.players;
    }
}

class Player {
    private user: Discord.User;
    private card: number;
    private favors: number;

    private handmaid: boolean;
    private spy: boolean;

    constructor(user: Discord.User, card: number) {
        this.user = user;
        this.card = card;
        this.favors = 0;

        this.handmaid = false;
        this.spy = false;
    }

    // I would like for this to be their nickname at some point, but for now I can't figure that out
    public getUsername() {
        return this.user.username;
    }

    public getUser() {
        return this.user;
    }

    public createDM() {
        return this.user.createDM();
    }

    public gainFavor() {
        this.favors++;
    }

    public getCard() {
        return this.card;
    }

    public setCard(card: number) {
        this.card = card;
    }

    public getFavors() {
        return this.favors;
    }

    public hasHandmaid() {
        return this.handmaid;
    }

    public hasSpy() {
        return this.spy;
    }

    public playCard(playedCard: number, notPlayedCard: number, message: Discord.Message, dm: Discord.DMChannel, players: Player[], deck: Deck) {
        this.card = notPlayedCard;
        this.handmaid = false;

        message.channel.send({ content: this.getUsername() + " played the " + numToCard(playedCard) });
        switch (playedCard) {
            case 0:
                this.spy = true;
                gameLoop(message, deck, players);
                break;
            case 1:
                chooseTarget(players, dm, playedCard, message, deck);
                break;
            case 2:
                chooseTarget(players, dm, playedCard, message, deck);
                break;
            case 3:
                chooseTarget(players, dm, playedCard, message, deck);
                break;
            case 4:
                this.handmaid = true;
                gameLoop(message, deck, players);
                break;
            case 5:
                chooseTarget(players, dm, playedCard, message, deck);
                break;
            case 6:
                // I HATE THE CHANCELLOR!!!!

                gameLoop(message, deck, players);
                break;
            case 7:
                chooseTarget(players, dm, playedCard, message, deck);
                break;
            case 8:
                // do nothing
                gameLoop(message, deck, players);
                break;
            case 9:
                // you lose

                gameLoop(message, deck, players);
                break;

            default:
                console.error("Played an invalid card");
                break;
        }
    }
}

class Deck {
    private cards: number[];

    constructor() {
        this.cards = [0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 8, 9];
    }

    public shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));

            let temp = this.cards[i];
            this.cards[i] = this.cards[j];
            this.cards[j] = temp;
        }
    }

    public draw() {
        return this.cards.pop();
    }

    public isEmpty() {
        return this.cards.length === 0;
    }
}

function numToCard(card: number) {
    switch (card) {
        case 0:
            return "Spy";
            break;
        case 1:
            return "Guard";
            break;
        case 2:
            return "Priest";
            break;
        case 3:
            return "Baron";
            break;
        case 4:
            return "Handmaid";
            break;
        case 5:
            return "Prince";
            break;
        case 6:
            return "Chancellor";
            break;
        case 7:
            return "King";
            break;
        case 8:
            return "Countess";
            break;
        case 9:
            return "Princess";
            break;
        default:
            return "Not a valid card";
            break;
    }
}
