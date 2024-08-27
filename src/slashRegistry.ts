require("dotenv").config();
// import { REST } from "@discordjs/rest";
// import { Routes } from "discord-api-types/v10";
const { Routes } = require("discord-api-types/v10");

// import * as REST from "@discordjs/rest";

const { REST } = require("@discordjs/rest");
const { SlashCommandBuilder } = require("@discordjs/builders");

// import { SlashCommandBuilder } from "@discordjs/builders";
// info needed for slash commands

const botID = "1275268227605332100";
const serverID = "845215682198896661"; // test server ID
const botToken = process.env.token;

const rest = new REST().setToken(botToken);
export const slashRegister = async (/**serverID*/) => {
    try {
        await rest.put(Routes.applicationGuildCommands(botID, serverID), {
            // remove server
            body: [
                new SlashCommandBuilder().setName("invisible").setDescription("sends a message only you can see!"),
                new SlashCommandBuilder().setName("ping").setDescription("a simple slash command :3"),
                new SlashCommandBuilder().setName("startgame").setDescription("Start a game of Love Letter"),
            ],
        });
    } catch (error) {
        console.error(error);
    }
};

// slashRegister();
