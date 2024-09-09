import * as Discord from "discord.js";

export function numToCard(card: number): string {
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

export type cardEmbed = {
    embed: Discord.EmbedBuilder;
    file: Discord.AttachmentBuilder;
};

export function numToEmbed(card: number, title: string) {

    let file: Discord.AttachmentBuilder;
    let embed: Discord.EmbedBuilder;
    switch (card) {
        case 0:
            file = new Discord.AttachmentBuilder('./assets/spy.jpeg');

            embed = new Discord.EmbedBuilder()
                .setColor(0x8B0000)
                .setTitle(title)
                .setImage("attachment://spy.jpeg")
                .setDescription("At the end of the round, if you are the\nonly player in the round who played or\ndiscarded a Spy, you gain 1 favor.");

            return { embed, file };
        case 1:
            file = new Discord.AttachmentBuilder('./assets/guard.jpeg');

            embed = new Discord.EmbedBuilder()
                .setColor(0x8B0000)
                .setTitle(title)
                .setImage("attachment://guard.jpeg")
                .setDescription("Choose another player and name a\nnon-Guard card. If that player has that\ncard, they are out of the round");

            return { embed, file };
        case 2:
            file = new Discord.AttachmentBuilder('./assets/priest.jpeg');

            embed = new Discord.EmbedBuilder()
                .setColor(0x8B0000)
                .setTitle(title)
                .setImage("attachment://priest.jpeg")
                .setDescription("Choose and look at another player's hand.");

            return { embed, file };
        case 3:
            file = new Discord.AttachmentBuilder('./assets/baron.jpeg');

            embed = new Discord.EmbedBuilder()
                .setColor(0x8B0000)
                .setTitle(title)
                .setImage("attachment://baron.jpeg")
                .setDescription("Choose and secretly compare hands\nwith another player. Whoever has\nthe lower value is out of the round.");

            return { embed, file };
        case 4:
            file = new Discord.AttachmentBuilder('./assets/handmaid.jpeg');

            embed = new Discord.EmbedBuilder()
                .setColor(0x8B0000)
                .setTitle(title)
                .setImage("attachment://handmaid.jpeg")
                .setDescription("Until your next turn, other\nplayers cannot choose you\nfor their card effects.");

            return { embed, file };
        case 5:
            file = new Discord.AttachmentBuilder('./assets/prince.jpeg');

            embed = new Discord.EmbedBuilder()
                .setColor(0x8B0000)
                .setTitle(title)
                .setImage("attachment://prince.jpeg")
                .setDescription("Choose any player (including\nyourself). That player discards\ntheir hand and redraws.");

            return { embed, file };
        case 6:
            file = new Discord.AttachmentBuilder('./assets/chancellor.jpeg');

            embed = new Discord.EmbedBuilder()
                .setColor(0x8B0000)
                .setTitle(title)
                .setImage("attachment://chancellor.jpeg")
                .setDescription("Draw 2 cards. Keep 1 card and\nput your other 2 on the bottom\nof the deck in any order.");

            return { embed, file };
        case 7:
            file = new Discord.AttachmentBuilder('./assets/king.jpeg');

            embed = new Discord.EmbedBuilder()
                .setColor(0x8B0000)
                .setTitle(title)
                .setImage("attachment://king.jpeg")
                .setDescription("Choose and trade hands with another player.");

            return { embed, file };
        case 8:
            file = new Discord.AttachmentBuilder('./assets/countess.jpeg');

            embed = new Discord.EmbedBuilder()
                .setColor(0x8B0000)
                .setTitle(title)
                .setImage("attachment://countess.jpeg")
                .setDescription("If the King or Prince is in your\nhand, you must play this card.");

            return { embed, file };
        case 9:
            file = new Discord.AttachmentBuilder('./assets/princess.jpeg');

            embed = new Discord.EmbedBuilder()
                .setColor(0x8B0000)
                .setTitle(title)
                .setImage("attachment://princess.jpeg")
                .setDescription("If you play or discard this card, \nyou are out of the round.");

            return { embed, file };
        default:
            file = new Discord.AttachmentBuilder("./assets/guard.jpeg");

            embed = new Discord.EmbedBuilder()
                .setColor(0x8B0000)
                .setTitle("Error")
                .setImage("attachment://guard.jpeg")
                .setDescription("Not a valid card value");

            return { embed, file };
    }
}
