import * as Discord from "discord.js";

export async function LoveLetter(gameQueue: Discord.User[], message: Discord.Message) {
    // gets all the dms here since you cant make constructors async
    const userToDMMap = new Map<Discord.User, Discord.DMChannel>();
    for (const user of gameQueue) {
        userToDMMap.set(user, await user.createDM());
    }

    const game = new Game(message, userToDMMap);
    game.gameLoop();
    // runs once the game is over
}


/**
 * Class to run the game of love letter
 */
class Game {
    // stuff that gets reset for each round
    private deck: Deck;
    private players: Player[];
    private message: Discord.Message; // to get the channel the game was started in
    private burn: number;

    // stuff that doesn't get reset & stays the same throughout the game
    private permPlayers: Player[]; // a list of players that they dont get deleted from when they die
    private winCondition: number; // number of favors needed to win the full game
    private gameWinners: Player[]; // a list of players that win the game, the game is over when this has anyone in it.

    constructor(message: Discord.Message, userMap: Map<Discord.User, Discord.DMChannel>) {
        this.deck = new Deck();
        this.deck.shuffle();

        // fill the players array with the users in gameQueue
        this.players = [];
        this.permPlayers = [];

        userMap.forEach((dm, user) => {
            const startingCard = this.deck.draw();

            dm.send({ content: "Your first card was the " + numToCard(startingCard) + "!" });

            const player = new Player(user, startingCard, this, dm);
            this.players.push(player);
            this.permPlayers.push(player);
        });

        this.burn = this.deck.draw();

        this.message = message;

        const winConditionArr: number[] = [6, 5, 4, 3, 3];
        this.winCondition = winConditionArr.at(this.players.length - 2);

        this.gameWinners = [];
    }

    public getDeck() {
        return this.deck;
    }

    public getPlayers() {
        return this.players;
    }

    public setPlayers(players: Player[]) {
        this.players = players;
    }

    public getMessage() {
        return this.message;
    }

    public sendMessage(message: string) {
        return this.message.channel.send({ content: message });
    }

    public getBurn() {
        return this.burn;
    }

    /**
     * Function that loops recursively each time a card is played. Loops until the game is finished.
     */
    public async gameLoop() {
        if (!this.deck.isEmpty() && this.players.length > 1) {
            const newCard = this.deck.draw();
            const player = this.players.at(0);

            // put the current player at the end of the list for next turn
            this.players.push(this.players.shift());

            // this.message.channel.send({ content: player.getUsername() + "'s Turn!\n\nThey're thinking about their next move..." });
            this.sendMessage(player.getUsername() + "'s Turn!\n\nThey're thinking about their next move...");

            this.sendMessage("🃏 There are **" + this.getDeck().cardsLeft() + "** cards left in the deck 🃏");

            // check for countess before printing the message
            let countessLocked = false;
            const cardArr = [player.getCard(), newCard];
            cardArr.sort((a, b) => b - a);
            if (cardArr.at(0) === 8 && (cardArr.at(1) === 7 || cardArr.at(1) === 5)) {
                // you have to play the countess
                countessLocked = true;
            }

            let messageContent = "";
            if (countessLocked) {
                messageContent = "You drew the " +
                    numToCard(newCard) +
                    "!\n\nReact '🟥' to play the " +
                    numToCard(cardArr.at(0)) +
                    "\n\nYou aren't allowed to play the " +
                    numToCard(cardArr.at(1));
            } else {
                messageContent = "You drew the " +
                    numToCard(newCard) +
                    "!\n\nReact '🟥' to play the " +
                    numToCard(player.getCard()) +
                    "\n\nReact '🟩' to play the " +
                    numToCard(newCard);
            }

            // handles the player's next move in DMs
            const dmMessage = await player.sendDM(messageContent);
            await dmMessage.react("🟥");
            if (!countessLocked) {
                await dmMessage.react("🟩");
            }

            const oldCardFilter = (reaction, user) => {
                return reaction.emoji.name === "🟥" && !user.bot;
            };

            const newCardFilter = (reaction, user) => {
                return reaction.emoji.name === "🟩" && !user.bot && !countessLocked;
            };

            const oldCardCollector = dmMessage.createReactionCollector({ filter: oldCardFilter, time: 120000 });
            const newCardCollector = dmMessage.createReactionCollector({ filter: newCardFilter, time: 120000 });

            oldCardCollector.on("collect", async (reaction, user) => {
                if (countessLocked) {
                    player.playCard(cardArr.at(0), cardArr.at(1));
                } else {
                    player.playCard(player.getCard(), newCard);
                }

                // stop the card collectors
                newCardCollector.stop();
                oldCardCollector.stop();
            });

            newCardCollector.on("collect", async (reaction, user) => {
                player.playCard(newCard, player.getCard());

                // stop the card collectors
                newCardCollector.stop();
                oldCardCollector.stop();
            });

            // oldCardCollector.on("end", async () => {
            //     player.sendDM("You took too long and have been removed from this round. ");
            //     this.sendMessage(player.getUsername() + " took too long and was removed from this round. ");
            //     player.kill();
            //     this.gameLoop();
            // });
        } else {
            this.sendMessage("Game is over!");
            let messageContent = "Game is over!\n\n";

            if (this.getPlayers().length === 1) {
                let winner = this.getPlayers().at(0);
                winner.gainFavor();
                messageContent += winner.getUsername() + " wins with a " + numToCard(winner.getCard()) + "!";

                if (winner.hasSpy()) {
                    winner.gainFavor();
                    messageContent += "\n\n" + winner.getUsername() + " was also the only remaining player with a spy, so they gain an extra favor!";
                }

                messageContent += "\n\nThey now have " + winner.getFavors() + " favor";
                if (winner.getFavors() !== 1) {
                    messageContent += "s";
                }

                this.sendMessage(messageContent);
            } else { // game is over, someone won
                let winningCard = -1;
                for (const player of this.getPlayers()) {
                    if (player.getCard() > winningCard) {
                        winningCard = player.getCard();
                    }
                }

                const winningPlayers: Player[] = [];
                const spyPlayers: Player[] = [];

                for (const player of this.getPlayers()) {
                    messageContent += player.getUsername() + " has a " + numToCard(player.getCard()) + " (" + player.getCard() + ")\n";

                    if (player.getCard() === winningCard) {
                        winningPlayers.push(player);
                    }

                    if (player.hasSpy()) {
                        spyPlayers.push(player);
                    }
                }

                messageContent += "\n\n";

                // winning with high card
                if (winningPlayers.length < 2) {
                    const winner = winningPlayers.at(0);

                    winner.gainFavor();
                    messageContent += winner.getUsername() + " wins with a " + numToCard(winner.getCard()) + "!\n\n";
                } else {
                    for (const winner of winningPlayers) {
                        if (winner === winningPlayers.at(-1)) { // last winning player
                            messageContent += ", and " + winner.getUsername();
                        } else if (winner === winningPlayers.at(0)) { // first winning player
                            messageContent += winner.getUsername();
                        } else {
                            messageContent += ", " + winner.getUsername();
                        }

                        winner.gainFavor();
                    }

                    messageContent += " win with a " + numToCard(winningCard) + "\n\n";
                }

                // getting spy point
                if (spyPlayers.length === 1) {
                    const spyHaver = spyPlayers.at(0);
                    spyHaver.gainFavor();

                    winningPlayers.push(spyHaver); // so the spy haver's new favor is displayed with the winning player's

                    messageContent += spyHaver.getUsername() + " was the only remaining player with a spy, so they gain a favor!\n\n";
                }


                // display all of the updated favors
                for (const winner of winningPlayers) {
                    messageContent += winner.getUsername() + " now has " + winner.getFavors() + " favor";
                    if (winner.getFavors() !== 1) {
                        messageContent += "s!\n";
                    } else {
                        messageContent += "!\n";
                    }

                    if (winner.getFavors() >= this.winCondition) {
                        this.gameWinners.push(winner);
                    }
                }

                this.sendMessage(messageContent);

                this.sendMessage("The burn card was a " + numToCard(this.getBurn()));

            }

            if (this.gameWinners.length > 1) {
                let messageContent = "🏆 ";
                for (const winner of this.gameWinners) {
                    if (winner === this.gameWinners.at(-1)) { // last winning player
                        messageContent += ", and " + winner.getUsername();
                    } else if (winner === this.gameWinners.at(0)) { // first winning player
                        messageContent += winner.getUsername();
                    } else {
                        messageContent += ", " + winner.getUsername();
                    }

                    messageContent += " won! 🏆";
                    this.sendMessage(messageContent);
                }
            } else if (this.gameWinners.length === 1) {
                const winner = this.gameWinners.at(0);
                this.sendMessage("🏆 " + winner.getUsername() + "won! 🏆");
            } else {
                const defaultContent = "No one reached " + this.winCondition + " favors, so no one won the full game yet!\n\n" + "Ready to start the next round?";

                const message = await this.sendMessage(defaultContent + "\n\nYes: \n\nNo: ");
                await message.react('✅');
                await message.react('❌');

                const yesList: Player[] = [];
                const noList: Player[] = [];

                const yesFilter = (reaction, user) => {
                    return reaction.emoji.name === "✅" && !user.bot;
                };
                const noFilter = (reaction, user) => {
                    return reaction.emoji.name === "❌" && !user.bot;
                };

                let timeout = true; // detects if the collectors were ended because they were timed out or not

                const yesCollector = message.createReactionCollector({ filter: yesFilter, time: 60000, dispose: true });
                const noCollector = message.createReactionCollector({ filter: noFilter, time: 60000, dispose: true });
                const almostTimer = message.createReactionCollector({ filter: () => { return false; }, time: 45000 });

                yesCollector.on("collect", async (reaction, user) => {
                    // check that the user reacting is in the permPlayers
                    let userPlayer: Player | undefined = undefined;
                    for (const player of this.permPlayers) {
                        if (player.getUser() === user) {
                            userPlayer = player;
                        }
                    }

                    if (userPlayer === undefined) {
                        // remove the reaction they added
                        const userReactions = message.reactions.cache.filter(reaction => reaction.users.cache.has(user.id));

                        for (const reaction of userReactions.values()) {
                            await reaction.users.remove(user.id);
                        }

                        // send a message
                        this.sendMessage("You can't join a game that's already started, but you can create another game by running the `/startgame` command!");
                    } else {
                        yesList.push(userPlayer);
                        let yesString = "\n\nYes: ";
                        for (const player of yesList) {
                            yesString += "\n" + player.getUsername();
                        }

                        let noString = "\n\nNo: ";
                        for (const player of noList) {
                            noString += "\n" + player.getUsername();
                        }

                        message.edit({ content: defaultContent + yesString + noString });
                    }

                    if (yesList.length + noList.length === this.permPlayers.length) {
                        // end all reaction detectors
                        timeout = false;
                        yesCollector.stop();
                        noCollector.stop();
                        almostTimer.stop();

                        this.sendMessage("All players have responded, now starting next round!");
                        this.players.length = 0; // WHAT!!!!!
                        this.permPlayers.length = 0;

                        yesList.forEach((player) => {
                            this.players.push(player);
                            this.permPlayers.push(player);
                        });

                        // start next round
                        this.setupNextRound();
                    }
                });

                yesCollector.on("remove", async (reaction, user) => {
                    // remove the user from the list
                    for (let i = 0; i < yesList.length; i++) {
                        if (yesList.at(i).getUser() === user) {
                            yesList.splice(i, 1);
                        }
                    }

                    let yesString = "\n\nYes: ";
                    for (const player of yesList) {
                        yesString += "\n" + player.getUsername();
                    }

                    let noString = "\n\nNo: ";
                    for (const player of noList) {
                        noString += "\n" + player.getUsername();
                    }

                    message.edit({ content: defaultContent + yesString + noString });


                });

                noCollector.on("collect", async (reaction, user) => {
                    // check that the user reacting is in the permPlayers
                    let userPlayer: Player | undefined = undefined;
                    for (const player of this.permPlayers) {
                        if (player.getUser() === user) {
                            userPlayer = player;
                        }
                    }

                    if (userPlayer === undefined) {
                        // remove the reaction they added
                        const userReactions = message.reactions.cache.filter(reaction => reaction.users.cache.has(user.id));

                        for (const reaction of userReactions.values()) {
                            await reaction.users.remove(user.id);
                        }

                        // send a message
                        this.sendMessage("You can't leave a game you aren't in! ");
                    } else {
                        noList.push(userPlayer);

                        let yesString = "\n\nYes: ";
                        for (const player of yesList) {
                            yesString += "\n" + player.getUsername();
                        }

                        let noString = "\n\nNo: ";
                        for (const player of noList) {
                            noString += "\n" + player.getUsername();
                        }

                        message.edit({ content: defaultContent + yesString + noString });
                    }

                    if (yesList.length + noList.length === this.permPlayers.length) {
                        // end all reaction detectors
                        timeout = false;
                        yesCollector.stop();
                        noCollector.stop();
                        almostTimer.stop();

                        this.sendMessage("All players have responded, now starting next round!");
                        this.players.length = 0; // WHAT!!!!!
                        this.permPlayers.length = 0;

                        yesList.forEach((player) => {
                            this.players.push(player);
                            this.permPlayers.push(player);
                        });

                        // start next round
                        this.setupNextRound();
                    }
                });

                noCollector.on("remove", async (reaction, user) => {
                    // remove the user from the list
                    for (let i = 0; i < noList.length; i++) {
                        if (noList.at(i).getUser() === user) {
                            noList.splice(i, 1);
                        }
                    }

                    let yesString = "\n\nYes: ";
                    for (const player of yesList) {
                        yesString += "\n" + player.getUsername();
                    }

                    let noString = "\n\nNo: ";
                    for (const player of noList) {
                        noString += "\n" + player.getUsername();
                    }

                    message.edit({ content: defaultContent + yesString + noString });
                });

                yesCollector.on("end", () => {
                    if (timeout) {
                        this.sendMessage("60 seconds has passed, starting next round!");
                        this.players.length = 0; // WHAT!!!!!
                        this.permPlayers.length = 0;

                        yesList.forEach((player) => {
                            this.players.push(player);
                            this.permPlayers.push(player);
                        });

                        // start next round
                        this.setupNextRound();
                    }
                });

                almostTimer.on("end", () => {
                    if (timeout) {
                        this.sendMessage("15 seconds until the next round starts!");
                    }
                });
            }
        }
    }

    /**
     * Mostly repeats the constructor to setup the next round
     */
    public setupNextRound() {
        if (this.players.length < 2) {
            this.sendMessage("There aren't enough players to play another round :/");
        } else {
            this.deck = new Deck();
            this.deck.shuffle();
            this.players.forEach((player) => {
                player.setCard(this.deck.draw());
                player.sendDM("Your first card was the " + numToCard(player.getCard()) + "!");
            });

            this.burn = this.deck.draw();

            const winConditionArr: number[] = [6, 5, 4, 3, 3];
            const lastWinCondition = this.winCondition;
            this.winCondition = winConditionArr.at(this.players.length - 2);
            if (this.winCondition !== lastWinCondition) {
                this.sendMessage("You now need " + this.winCondition + " favors to win, since there are now " + this.players.length + " players");
            }

            this.gameWinners = [];

            this.gameLoop();
        }
    }
}

/**
 * Class for one player in the game, corresponding to a discord user
 */
class Player {
    private user: Discord.User;
    private card: number;
    private favors: number;

    private handmaid: boolean;
    private spy: boolean;

    private game: Game;

    private dm: Discord.DMChannel | null;

    constructor(user: Discord.User, card: number, game: Game, dm: Discord.DMChannel) {
        this.user = user;
        this.card = card;
        this.favors = 0;

        this.handmaid = false;
        this.spy = false;

        this.game = game;

        this.dm = dm;
    }

    // I would like for this to be their nickname at some point, but for now I can't figure that out
    public getUsername() {
        return this.user.username;
    }

    public getUser() {
        return this.user;
    }

    public getDM() {
        return this.dm;
    }

    public sendDM(message: string) {
        return this.dm.send({ content: message });
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

    public playSpy() {
        this.spy = true;
    }

    /**
     * removes the player from the gamequeue array when they lose in the round
     */
    public kill() {
        const playerIndex = this.game.getPlayers().indexOf(this);

        this.game.getPlayers().splice(playerIndex, 1);

        this.sendDM("You are out!\n\nYou'll be back in next round!");

        this.game.sendMessage(this.getUsername() + " is out!");
    }

    /**
     * Allows the current player to choose a target for an offensive card
     */
    public async chooseTarget(card: number) {
        const players = this.game.getPlayers();

        let targetStr = "";
        const emojiArr = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣"]; // this assumes a max of 6 players, which is maybe not the best :/
        let numTargets = 0;
        const emojiToPlayer = new Map<string, Player>();

        // setup the potential targets for the action
        for (const player of players) {
            // should allow you to play the prince on yourself
            if ((player !== this && !player.hasHandmaid()) || (player === this && card === 5)) {
                targetStr += "\n" + emojiArr.at(numTargets) + ": " + player.getUsername();
                emojiToPlayer.set(emojiArr.at(numTargets), player);
                numTargets++;
            }
        }

        if (numTargets === 0) {
            this.sendDM("You can't use the " + numToCard(card) + " on anyone, you play it to no effect.");
            this.game.gameLoop();
        } else {
            const dmMessage = await this.dm.send({ content: "Who do you want to use the " + numToCard(card) + " on?\n" + targetStr });

            for (let i = 0; i < numTargets; i++) {
                await dmMessage.react(emojiArr.at(i));
            }

            // setup collectors for each reaction in the most unreadable way possible.
            let filterArr = [];
            let collectorArr = [];
            for (let i = 0; i < numTargets; i++) {
                filterArr.push((reaction, user) => {
                    return reaction.emoji.name === emojiArr.at(i) && !user.bot;
                });

                collectorArr.push(dmMessage.createReactionCollector({ filter: filterArr.at(i), time: 120000 }));
            }

            // run the collectors for all of the reactions
            for (let i = 0; i < numTargets; i++) {
                collectorArr.at(i).on("collect", async (reaction, user) => {
                    // do the corresponding action for card
                    this.offensiveAction(card, emojiToPlayer.get(emojiArr.at(i)));

                    // stop all the running collectors
                    collectorArr.forEach((collector) => {
                        collector.stop();
                    });
                });
            }

            // collectorArr.at(0).on("end", async () => {
            //     this.sendDM("You took too long and have been removed from this round. ");
            //     this.game.sendMessage(this.getUsername() + " took too long and was removed from this round. ");
            //     this.kill();
            //     this.game.gameLoop();
            // });
        }

    }

    /**
     * Handles cards that attack another player in some way.
     * @param card 
     * @param target 
     * @param dm 
     */
    public async offensiveAction(card: number, target: Player) {
        switch (card) {
            case 1:
                // create another dm with the 9 options for what you can guess

                this.game.sendMessage(this.getUsername() + " is thinking...");

                const dmMessage = await this.sendDM(
                    "What do you think " + target.getUsername() + " has?\n\n" +
                    "0️⃣: Spy\n" +
                    "2️⃣: Priest\n" +
                    "3️⃣: Baron\n" +
                    "4️⃣: Handmaid\n" +
                    "5️⃣: Prince\n" +
                    "6️⃣: Chancellor\n" +
                    "7️⃣: King\n" +
                    "8️⃣: Countess\n" +
                    "9️⃣: Princess\n"
                );
                const emojiArr = ["0️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];
                emojiArr.forEach(async (emoji) => {
                    await dmMessage.react(emoji);
                });

                // map each emoji to its corresponding numbered card
                const emojiToCard = new Map<string, number>();
                emojiToCard.set("0️⃣", 0);
                for (let i = 1; i < emojiArr.length; i++) {
                    emojiToCard.set(emojiArr.at(i), i + 1);
                }

                // setup collectors
                let filterArr = [];
                let collectorArr = [];
                for (const emoji of emojiArr) {
                    filterArr.push((reaction, user) => {
                        return reaction.emoji.name === emoji && !user.bot;
                    });

                    collectorArr.push(dmMessage.createReactionCollector({ filter: filterArr.at(emojiArr.indexOf(emoji)), time: 120000 }));
                }

                // run the collectors for all of the reactions
                for (let i = 0; i < emojiArr.length; i++) {
                    collectorArr.at(i).on("collect", async (reaction, user) => {
                        // stop all the running collectors
                        collectorArr.forEach((collector) => {
                            collector.stop();
                        });

                        // make the guess
                        const guessedCard = emojiToCard.get(emojiArr.at(i));

                        this.game.sendMessage(this.getUsername() + " thinks " + target.getUsername() + " has a " + numToCard(guessedCard) + "!");
                        if (target.getCard() === guessedCard) {
                            this.game.sendMessage(target.getUsername() + " did have a " + numToCard(guessedCard) + "!");
                            target.kill();
                        } else {
                            this.game.sendMessage(target.getUsername() + " did not have a " + numToCard(guessedCard));
                        }

                        this.game.gameLoop();
                    });
                }

                // collectorArr.at(0).on("end", async () => {
                //     this.sendDM("You took too long and have been removed from this round. ");
                //     this.game.sendMessage(this.getUsername() + " took too long and was removed from this round. ");
                //     this.kill();
                //     this.game.gameLoop();
                // });

                break;
            case 2:
                // dm the person who played the card what the target had.
                this.game.sendMessage(this.getUsername() + " is looking at " + target.getUsername() + "'s card!");

                target.sendDM(this.getUsername() + " is looking at your card!");

                this.sendDM(target.getUsername() + " has a " + numToCard(target.getCard()));

                this.game.gameLoop();
                break;
            case 3:
                // message the server that a baron is happening & who the loser is
                this.game.sendMessage(this.getUsername() + " is comparing cards with " + target.getUsername() + "!");

                target.sendDM(this.getUsername() + " has a " + numToCard(this.getCard()));

                this.sendDM(target.getUsername() + " has a " + numToCard(target.getCard()));

                let winner: Player, loser: Player;

                // determine who won and lost, or if there was a tie
                if (this.getCard() > target.getCard()) {
                    winner = this;
                    loser = target;
                } else if (this.getCard() < target.getCard()) {
                    winner = target;
                    loser = this;
                } else {
                    // tie :O
                    // message server that there was a tie!
                    this.game.sendMessage(this.getUsername() + " and " + target.getUsername() + "have the same card!");

                    // do nothing, start the next loop
                    this.game.gameLoop();
                    break;
                }

                this.game.sendMessage(loser.getUsername() + " lost to " + winner.getUsername() + "\n\n" + loser.getUsername() + " had a " + numToCard(loser.getCard()));
                loser.kill();

                this.game.gameLoop();
                break;
            case 5:
                // message the server that the player is discarding & what that card is, then DM that player what their new card is
                if (target !== this) {
                    this.game.sendMessage(this.getUsername() + " is making " + target.getUsername() + " discard their card!");
                } else {
                    this.game.sendMessage(this.getUsername() + " is discarding their own card!");
                }

                this.game.sendMessage(target.getUsername() + " discarded a " + numToCard(target.getCard()));
                if (target.getCard() === 9) {
                    target.kill();
                } else {
                    if (target.getCard() === 0) {
                        target.playSpy();
                    }

                    target.setCard(this.game.getDeck().draw());

                    // you played the prince on the last card of the game
                    if (target.getCard() === undefined) {
                        target.setCard(this.game.getBurn());
                    }
                    target.sendDM("Your new card is a " + numToCard(target.getCard()));
                }

                this.game.gameLoop();
                break;
            case 7:
                // message the server that 2 players are swapping hands 
                this.game.sendMessage(this.getUsername() + " is swapping cards with " + target.getUsername() + "!");

                // DM target that they are being swapped with
                target.sendDM(this.getUsername() + " is swapping hands with you!");

                // swap hands
                const temp = this.getCard();
                this.setCard(target.getCard());
                target.setCard(temp);

                // DM both players their new cards.

                target.sendDM(this.getUsername() + " gave you the " + numToCard(target.getCard()));

                this.sendDM("You took the " + numToCard(this.getCard()) + " from " + target.getUsername() + "!");

                this.game.gameLoop();
                break;
            default:
                console.error("Inoffensive card treated as offensive");
                break;
        }
    }

    public async playCard(playedCard: number, notPlayedCard: number) {
        this.card = notPlayedCard;
        this.handmaid = false;

        this.game.sendMessage(this.getUsername() + " played the " + numToCard(playedCard));
        switch (playedCard) {
            case 0:
                this.spy = true;
                this.game.gameLoop();
                break;
            case 1:
                this.chooseTarget(playedCard);
                break;
            case 2:
                this.chooseTarget(playedCard);
                break;
            case 3:
                this.chooseTarget(playedCard);
                break;
            case 4:
                this.handmaid = true;
                this.game.gameLoop();
                break;
            case 5:
                this.chooseTarget(playedCard);
                break;
            case 6:
                // I HATE THE CHANCELLOR!!!!

                this.game.sendMessage(this.getUsername() + " is thinking...");

                const cardArr: number[] = [this.getCard()];
                for (let i = 0; i < 2; i++) {
                    const drawnCard = this.game.getDeck().draw();
                    if (drawnCard !== undefined) {
                        cardArr.push(drawnCard);
                    }
                }

                const emojiArr = ["🟥", "🟩", "🟦"];
                emojiArr.length = cardArr.length;

                let messageContent = "";
                if (emojiArr.length === 1) {
                    messageContent = "There weren't enough cards in the deck to pick up...";
                } else {
                    messageContent = "You drew a " + numToCard(cardArr.at(1));
                    if (cardArr.length > 2) {
                        messageContent += " and a " + numToCard(cardArr.at(2));
                    }

                    messageContent += "!\n\nWhich card do you want to keep?";
                    for (let i = 0; i < emojiArr.length; i++) {
                        messageContent += "\n" + emojiArr.at(i) + ": Keep the " + numToCard(cardArr.at(i));
                    }
                }

                const dmMessage = await this.sendDM(messageContent);

                for (const emoji of emojiArr) {
                    if (emojiArr.length > 1) {
                        dmMessage.react(emoji);
                    }
                }

                let filterArr = [];
                let collectorArr = [];

                for (let i = 0; i < emojiArr.length; i++) {
                    filterArr.push((reaction, user) => {
                        return reaction.emoji.name === emojiArr.at(i) && !user.bot;
                    });

                    collectorArr.push(dmMessage.createReactionCollector({ filter: filterArr.at(i) }));
                }

                // run the collectors for all of the reactions
                for (let i = 0; i < emojiArr.length; i++) {
                    collectorArr.at(i).on("collect", async (reaction, user) => {
                        // stop all the running collectors
                        collectorArr.forEach((collector) => {
                            collector.stop();
                        });


                        this.setCard(cardArr.at(i));
                        cardArr.splice(i, 1);
                        emojiArr.splice(i, 1);
                        filterArr.splice(i, 1);
                        messageContent = "You are keeping the " + numToCard(this.getCard()) + "\n\n";

                        if (cardArr.length < 2) {
                            messageContent += "The " + numToCard(cardArr.at(0)) + " was put back on the deck";
                        } else {
                            messageContent += "Now, which order do you want to put the remaining cards back in?\n";

                            messageContent += "\n" + emojiArr.at(0) + ": Put the " + numToCard(cardArr.at(0)) + " below the " + numToCard(cardArr.at(1));
                            messageContent += "\n" + emojiArr.at(1) + ": Put the " + numToCard(cardArr.at(1)) + " below the " + numToCard(cardArr.at(0));
                        }

                        const followUp = await this.sendDM(messageContent);

                        let followUpCollectors = [];

                        if (cardArr.length > 1) {
                            for (let i = 0; i < emojiArr.length; i++) {
                                followUp.react(emojiArr.at(i));
                                // shoutout to my code for being impossible to read !!!!!
                                // creates a reaction collector on each reaction that detects the corresponding emoji reaction
                                followUpCollectors.push(followUp.createReactionCollector({
                                    time: 120000, filter: (reaction, user) => {
                                        return reaction.emoji.name === emojiArr.at(i) && !user.bot;
                                    }
                                }));
                            }

                            for (let i = 0; i < emojiArr.length; i++) {
                                followUpCollectors.at(i).on("collect", async (reaction, user) => {
                                    let top: number, bottom: number;
                                    if (i == 0) {
                                        top = cardArr.at(1);
                                        bottom = cardArr.at(0);
                                    } else {
                                        top = cardArr.at(0);
                                        bottom = cardArr.at(1);
                                    }

                                    this.game.getDeck().addToDeck(top);
                                    this.game.getDeck().addToDeck(bottom);
                                    this.sendDM("The cards were put back at the bottom of the deck, don't forget what they are!\n\nDeck\n" + numToCard(top) + "\n" + numToCard(bottom));

                                    followUpCollectors.forEach((collector) => {
                                        collector.stop();
                                    });

                                    this.game.gameLoop();
                                });
                            }

                            // followUpCollectors.at(0).on("end", async () => {
                            //     this.sendDM("You took too long and have been removed from this round. ");
                            //     this.game.sendMessage(this.getUsername() + " took too long and was removed from this round. ");
                            //     this.kill();
                            //     this.game.gameLoop();
                            // });
                        }
                    });
                }

                // collectorArr.at(0).on("end", async () => {
                //     this.sendDM("You took too long and have been removed from this round. ");
                //     this.game.sendMessage(this.getUsername() + " took too long and was removed from this round. ");
                //     this.kill();
                //     this.game.gameLoop();
                // });
                break;
            case 7:
                this.chooseTarget(playedCard);
                break;
            case 8:
                // do nothing
                this.game.gameLoop();
                break;
            case 9:
                // you lose
                this.kill();

                this.game.gameLoop();
                break;

            default:
                console.error("Played an invalid card");
                break;
        }
    }
}

/**
 * Class for the full deck of Love Letter cards
 */
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

    public cardsLeft() {
        return this.cards.length;
    }

    public addToDeck(card: number) {
        this.cards.unshift(card);
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
