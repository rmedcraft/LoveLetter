import * as Discord from "discord.js";
import { LoveLetter } from "./loveLetter";

require("dotenv").config();

const client = new Discord.Client({ intents: ["Guilds", "GuildMessages", "GuildMessageReactions"] });

client.on("ready", () => {
    console.log("Bot is ready :O");
});

// registers the slash commands individually for each server the bot joins.
// its possible to register the commands without the serverID, but that takes an hour to go through and I no wanna during testing
// client.on("guildCreate", (guild) => {
//     // slashRegister(guild.id);
// });

client.on("interactionCreate", async (interaction) => {
    if (interaction.isCommand()) {
        if (interaction.commandName === "ping") {
            interaction.reply({ content: "pong" }); // ephemeral: true
        }
        if (interaction.commandName === "invisible") {
            interaction.reply({ content: "WAOW!! Only YOU can see this message!!!", ephemeral: true });
        }
        if (interaction.commandName === "startgame") {
            /**
             * create message to get people into the love letter game
             * probably an embed that you can react to join on
             * put every player that reacts to the message into an array, and if the array is 2-6 players long, start the round
             * pass the array of playerIDs, & the channelID (?) to LoveLetter()
             */
            // the original content of the message
            const defaultContent = "React to this message to play Love Letter! \n\nQueued to play:";

            const message = await interaction.reply({ content: defaultContent, fetchReply: true });
            if (!(message instanceof Discord.Message)) return;

            // reacts to the message so that others can react to it
            message.react("💌");
            // message.react("1️⃣");

            // detects when a user reacts to the message, and when it
            let gameQueue: Discord.User[] = [];

            const collectorFilter = (reaction, user) => {
                return reaction.emoji.name === "💌" && !user.bot;
            };

            const collector = message.createReactionCollector({ filter: collectorFilter, time: 30000, dispose: true });

            collector.on("collect", async (reaction, user) => {
                // edit the gameQueue and the message to include the usernames of people who reply
                gameQueue.push(user);

                let queueString = "";
                for (const user of gameQueue) {
                    queueString += "\n" + user.username; // change to be user nickname
                }

                await interaction.editReply(defaultContent + queueString);
            });

            collector.on("remove", async (reaction, user) => {
                // this is just gameQueue.remove(gameQueue.indexOf(user)) but that doesnt exist in typescript so I gotta do this shit
                gameQueue = gameQueue.slice(0, gameQueue.indexOf(user)).concat(gameQueue.slice(gameQueue.indexOf(user) + 1));

                let queueString = "";
                for (const user of gameQueue) {
                    queueString += "\n" + user.username; // change to be user nickname
                }

                await interaction.editReply(defaultContent + queueString);
            });

            collector.on("end", (collected) => {
                message.channel.send("30 seconds has passed, no more players being collected");
                collector.stop();
                // interaction.followUp("30 seconds has passed, no more players being collected");
                LoveLetter(gameQueue, message);
            });
        }
    }
});

client.login(process.env.token);
