import * as Discord from "discord.js";
import { LoveLetter } from "./loveLetter";
import { slashRegister } from "./slashRegistry";

require("dotenv").config();

// leaving this commented out, if theres ever an error that u cant figure out, uncomment this and itll probably go away, then figure out which intent ur missing
// const client = new Discord.Client({
//     intents: Object.keys(Discord.GatewayIntentBits).map((a) => {
//         return Discord.GatewayIntentBits[a];
//     })
// });

// ugh, security :/
const client = new Discord.Client({
    intents: ["Guilds", "GuildMessages", "GuildMessageReactions", "DirectMessageReactions"]
});

client.on("ready", () => {
    console.log("Bot is ready :O");
});

// registers the slash commands individually for each server the bot joins.
// its possible to register the commands without the serverID, but that takes an hour to go through and I no wanna during testing
client.on("guildCreate", (guild) => {
    slashRegister(guild.id);
});

client.on("interactionCreate", async (interaction) => {
    if (interaction.isCommand()) {
        if (interaction.commandName === "startgame") {
            // the original content of the message
            const defaultContent = "React to this message to play Love Letter! \n\nQueued to play:";

            const message = await interaction.reply({ content: defaultContent, fetchReply: true });

            // reacts to the message so that others can react to it
            message.react("💌");

            // detects when a user reacts to the message, and when it
            let gameQueue: Discord.User[] = [];

            const collectorFilter = (reaction, user) => {
                return reaction.emoji.name === "💌" && !user.bot;
            };

            const collector = message.createReactionCollector({ filter: collectorFilter, time: 30000, dispose: true });

            const maxPlayers = 1;
            collector.on("collect", async (reaction, user) => {
                // edit the gameQueue and the message to include the usernames of people who reply
                if (gameQueue.length < maxPlayers) {
                    gameQueue.push(user);

                    let queueString = "";
                    for (const user of gameQueue) {
                        queueString += "\n" + user.username; // change to be user nickname
                    }

                    await interaction.editReply(defaultContent + queueString);
                } else {
                    // remove the reaction, and warn that the max of 6 players has been reached
                    const userReactions = message.reactions.cache.filter(reaction => reaction.users.cache.has(user.id));

                    for (const reaction of userReactions.values()) {
                        await reaction.users.remove(user.id);
                    }

                    message.channel.send({ content: "The max amount of players has been reached, if another player leaves before the game starts, you will be able to join" });
                }
            });

            collector.on("remove", async (reaction, user) => {
                // removes the user from the gamequeue
                if (gameQueue.length !== maxPlayers) {
                    gameQueue.splice(gameQueue.indexOf(user), 1);

                    let queueString = "";
                    for (const user of gameQueue) {
                        queueString += "\n" + user.username; // change to be user nickname
                    }

                    await interaction.editReply(defaultContent + queueString);
                }
            });


            collector.on("end", async (collected) => {
                collector.stop();
                if (gameQueue.length > 1) {
                    message.channel.send("30 seconds has passed, game is starting!");
                    LoveLetter(gameQueue, message);
                } else {
                    message.channel.send("Not enough players joined, Love letter requires 2-6 players");
                }
            });
        }

        if (interaction.commandName === "github") {
            interaction.reply({ content: "The code for this bot can be found at https://github.com/rmedcraft/LoveLetter \n\nYou can find my other projects at https://github.com/rmedcraft" });
        }

        if (interaction.commandName === "infocard") {
            interaction.reply({
                content:
                    "**9 - Princess** (x1): Out of the round if you play/discard.\n" +
                    "**8 - Countess** (x1): Must play if you have King or Prince.\n" +
                    "**7 - King** (x1): Trade hands.\n" +
                    "**6 - Chancellor** (x2): Draw & return 2 cards.\n" +
                    "**5 - Prince** (x2): Discard a hand & redraw.\n" +
                    "**4 - Handmaid** (x2): Immune to other cards until your next turn.\n" +
                    "**3 - Baron** (x2): Compare hands.\n" +
                    "**2 - Priest** (x2): Look at a hand.\n" +
                    "**1 - Guard** (x6): Guess a hand.\n" +
                    "**0 - Spy** (x2): Gain favor if no one else plays/discards a Spy."
            });
        }
    }
});

client.login(process.env.token);
