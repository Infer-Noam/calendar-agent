import "dotenv/config";
import { Bot } from "grammy";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set");
}

const bot = new Bot(token);

bot.on("message:text", async (ctx) => {
  await ctx.reply(`echo: ${ctx.message.text}`);
});

bot.start();
console.log("Telegram bot started (long polling)");
