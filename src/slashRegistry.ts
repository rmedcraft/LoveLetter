require("dotenv").config();

const { Routes } = require("discord-api-types/v10");


const { REST } = require("@discordjs/rest");
const { SlashCommandBuilder } = require("@discordjs/builders");


const botID = "1275268227605332100";
const botToken = process.env.token;

const rest = new REST().setToken(botToken);
export const slashRegister = async (serverID) => {
    try {
        await rest.put(Routes.applicationGuildCommands(botID, serverID), {
            body: [
                new SlashCommandBuilder().setName("startgame").setDescription("Start a game of Love Letter"),
                new SlashCommandBuilder().setName("github").setDescription("Look at the code for this bot"),
                new SlashCommandBuilder().setName("infocard").setDescription("Look at the description for each card"),
            ],
        });
    } catch (error) {
        console.error(error);
    }
};
