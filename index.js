import { Telegraf } from "telegraf";
import ytdl from "ytdl-core";

const token = TELEGRAM_BOT_TOKEN; // Access the environment variable directly in Cloudflare Workers
const bot = new Telegraf(token);

let videoChunkList = [];
let formatOptions = [];

const createFormatKeyBoard = (formatList) => ({
  reply_markup: {
    inline_keyboard: [formatList.map((el) => ({ text: el, callback_data: el }))]
  }
});

const getVideoUrl = async (url, chatId) => {
  try {
    const info = await ytdl.getInfo(url);
    info.formats.forEach((chunk) => {
      if (chunk.hasVideo && chunk.hasAudio) {
        formatOptions.push("format: " + chunk.qualityLabel);
        videoChunkList.push(chunk);
      } else if (chunk.hasAudio && !chunk.hasVideo && chunk.mimeType.includes("audio/mp4")) {
        formatOptions.push("format: " + "mp3");
        videoChunkList.push(chunk);
      }
    });

    const formatButtons = createFormatKeyBoard(formatOptions);
    await bot.telegram.sendMessage(chatId, "Choose video or audio format:", formatButtons);
  } catch (error) {
    await bot.telegram.sendMessage(chatId, "Sorry, no video found...");
    console.error(error.message);
  }
};

// Start command
bot.command("start", (ctx) => {
  ctx.reply("Welcome to the YouTube Video Downloader Bot!");
});

// URL Command
bot.hears(/\/url/, async (ctx) => {
  const url = ctx.message.text.split(" ")[1];
  await ctx.reply("Please wait while we are processing your link...");
  formatOptions = [];
  await getVideoUrl(url, ctx.chat.id);
});

// Format Selection
bot.action(/^format: ([A-z0-9]+)$/, async (ctx) => {
  const format = ctx.match[1];
  const chatId = ctx.chat.id;

  videoChunkList.forEach(async (chunk) => {
    const keyboard = {
      reply_markup: { inline_keyboard: [[{ text: "Open in Browser", url: chunk.url }]] }
    };

    if (format === "mp3" && chunk.qualityLabel === null) {
      await ctx.reply("Here is the link 😃", keyboard);
      formatOptions = [];
      videoChunkList = [];
    } else if (chunk.qualityLabel === format) {
      await ctx.reply("Here is the link 😃", keyboard);
      formatOptions = [];
      videoChunkList = [];
    }
  });
});

// Help Command
bot.command("help", (ctx) => {
  ctx.reply(`Use the correct format to get the video.\nExample: /url https://www.youtube.com/watch?v=VIDEO_ID`);
});

// Info Command
bot.command("botInfo", (ctx) => {
  ctx.reply(`This bot is created to download YouTube videos by URL.`);
});

// Text Handler
bot.on("text", (ctx) =>
  ctx.reply(`I'm unfamiliar with this, please use /hello for more info.`)
);

addEventListener("fetch", (event) => {
  event.respondWith(bot.handleUpdate(JSON.parse(event.request.body)));
});
