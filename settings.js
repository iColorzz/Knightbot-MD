require('dotenv').config();

const settings = {
  packname: 'CLRBOT',
  author: 'CLRStreaming',
  botName: "CLRBOT",
  botOwner: 'CLRStreaming', // Your name
  ownerNumber: '5215524043577', //Set your number here without + symbol, just add country code & number without any space
  giphyApiKey: 'qnl7ssQChTdPjsKta2Ax2LMaGXz303tq',
  commandMode: "public",
  maxStoreMessages: 20, 
  storeWriteInterval: 10000,
  description: "Bot oficial de CLRStreaming — moderación de grupos y automatización. clrcolorz.shop",
  version: "3.0.8",
  updateZipUrl: "https://github.com/mruniquehacker/Knightbot-MD/archive/refs/heads/main.zip",
  // Media / Knight API (song, video, cards, etc.)
  knightApiUrl: process.env.KNIGHT_API_URL || 'https://knightbotapi.stream',
  knightApiKey: process.env.KNIGHT_API_KEY || 'knight',
  mediaApiUrl: process.env.MEDIA_API_URL || 'https://knightbotapi.stream',
  mediaApiKey: process.env.MEDIA_API_KEY || 'knight',
  princeApiUrl: process.env.PRINCE_API_URL || 'https://api.princetechn.com',
  princeApiKey: process.env.PRINCE_API_KEY || 'prince',
};

module.exports = settings;
