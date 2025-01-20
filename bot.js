require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const solanaWeb3 = require('@solana/web3.js');
const bs58 = require('bs58');
const { createClient } = require('redis');
const { parse } = require('dotenv');
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
        [{ text: 'Check Balance 💵', callback_data: 'checkBalance' }],
        [{ text: 'Deposit 💰', callback_data: 'deposit' }],
        [{ text: 'Withdraw 💸', callback_data: 'withdraw' }],
        [{ text: 'Talk to admin 💬', callback_data: 'talkToAdmin' }]
    ]
};


const closeall = {
    inline_keyboard: [
        [{ text: 'Exit ❌', callback_data: 'close' }]
    ]
};

const admin1 = '1693228494';
const amdin2 = '7724512663';


bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
    const userId = msg.from.id.toString();
    const Code = match ? match[1] : null;
    const first_name = msg.from.first_name;
    const chatId = msg.chat.id.toString();
    const username = msg.from.username;
    const messageId = msg.message_id;

    await connectRedis();

    if(msg.chat.type === 'private'){
      bot.sendMessage(chatId, `Not valid!`)
    }else{
        bot.sendMessage(chatId, `Push /show for dashboard`)
    }
});


let showpin;
bot.onText(/\/show/, async (msg) => {
    const chatId = msg.chat.id.toString();
    const chatTitle = msg.chat.title;

    await connectRedis();

    if(msg.chat.type === 'group' || msg.chat.type === 'supergroup'){
        const key = `sportsbets:users:${chatId}`; 
     
        const existingUser = await redisClient.hGetAll(key);
        if (Object.keys(existingUser).length > 0) {
            showpin = await bot.sendMessage(chatId, `<b>Welcome to <a href='https://sportsbets.ag/'>SportsBets</a> ♠️</b>\n\n<b>📑 ChatId:</b> <code>${chatId}</code>`, {reply_markup: JSON.stringify(welcome1), parse_mode: 'HTMl', disable_web_page_preview: true}) 
            await bot.pinChatMessage(chatId, showpin.message_id); 

            return;
        }

        await redisClient.hSet(key, {
            userId: chatId,
            username: chatTitle,
            balance: 'Not updated by admin'
        });
        showpin = await bot.sendMessage(chatId, `<b>Welcome to <a href='https://sportsbets.ag/'>SportsBets</a> ♠️</b>\n\n<b>📑 ChatId:</b> <code>${chatId}</code>`, {reply_markup: JSON.stringify(welcome1), parse_mode: 'HTMl', disable_web_page_preview: true}) 
        await bot.pinChatMessage(chatId, showpin.message_id); 
    }else{
        bot.sendMessage(chatId, `Not here, bro!`)
    }

    
});

bot.onText(/\/balance/, async (msg) => {
    const chatId = msg.chat.id.toString();
    const chatTitle = msg.chat.title;
    const key = `sportsbets:users:${chatId}`; 
    await connectRedis()
    const existingUser = await redisClient.hGetAll(key);
    const balance = existingUser.balance;
    const username = existingUser.username;
    if(msg.chat.type === 'group' || msg.chat.type === 'supergroup'){
        bot.sendMessage(chatId, `<b>Your balance 💰</b>\n\n👤 <b>Username:</b> ${username}\n<b>💵 Balance: </b>${balance}`, {parse_mode: 'HTML', reply_markup: JSON.stringify(closeall)});
    }else{
        bot.sendMessage(chatId, `Not here, bro!`)
    }
    
});

bot.onText(/\/deposit/, async (msg) => {
    const chatId = msg.chat.id.toString();
    const chatTitle = msg.chat.title;
    const key = `sportsbets:users:${chatId}`; 
    await connectRedis()
    const existingUser = await redisClient.hGetAll(key);
    const balance = existingUser.balance;
    const username = existingUser.username;
    if(msg.chat.type === 'group' || msg.chat.type === 'supergroup'){
        bot.sendMessage(chatId, `Send below, how much you want to deposit ? 💰`, {reply_markup: JSON.stringify(closeall), parse_mode: 'HTML'});
        depositUserId = chatId;
        wanaDeposit = true;
    }else{
        bot.sendMessage(chatId, `Not here, bro!`)
    }
    
});

bot.onText(/\/withdraw/, async (msg) => {
    const chatId = msg.chat.id.toString();
    const chatTitle = msg.chat.title;
    const key = `sportsbets:users:${chatId}`; 
    await connectRedis()
    const existingUser = await redisClient.hGetAll(key);
    const balance = existingUser.balance;
    const username = existingUser.username;
    if(msg.chat.type === 'group' || msg.chat.type === 'supergroup'){
        bot.sendMessage(chatId, `You balance is <code>${balance}</code> USD, Send below how much you want to withdraw ? 💸`, {reply_markup: JSON.stringify(closeall), parse_mode: 'HTML'});
        withdrawUserId = chatId;
        wanaWithdraw = true;
    }else{
        bot.sendMessage(chatId, `Not here, bro!`)
    }
    
});

let wanaDeposit = false;
let depositUserId;
let confirmDeposit = false;


let wanaWithdraw = false;
let withdrawUserId;
let wanaWithdrawDeatils = false;
let withdrawAmount = '0';
let withdrawMethod = 'none';

let wanaSend = false;
let sendUserId;
let toSend = 'none';


bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id.toString();
    const data = callbackQuery.data;
    const key = `sportsbets:users:${chatId}`; 
    await connectRedis()
    const existingUser = await redisClient.hGetAll(key);
    const balance = existingUser.balance;
    const username = existingUser.username;


    if(data === 'checkBalance'){
        bot.sendMessage(chatId, `<b>Your balance 💰</b>\n\n👤 <b>Username:</b> ${username}\n<b>💵 Balance: </b>${balance}`, {parse_mode: 'HTML', reply_markup: JSON.stringify(closeall)});
        return;
    }
    if(data === 'talkToAdmin'){
        const adminLink = `<a href="tg://user?id=${'1693228494'}">Leviathanlocks</a>`;

        bot.sendMessage(chatId, `${adminLink}, Pinged ‼️`);
        return;
    }
    if(data === 'deposit'){
        bot.sendMessage(chatId, `Send below, how much you want to deposit ? 💰`, {reply_markup: JSON.stringify(closeall), parse_mode: 'HTML'});
        depositUserId = chatId;
        wanaDeposit = true;
        return;
    }
    if(data === 'withdraw'){
        bot.sendMessage(chatId, `You balance is <code>${balance}</code> USD, Send below how much you want to withdraw ? 💸`, {reply_markup: JSON.stringify(closeall), parse_mode: 'HTML'});
        withdrawUserId = chatId;
        wanaWithdraw = true;
        return;
    }
    if(data === 'close'){
        bot.deleteMessage(chatId, callbackQuery.message.message_id)
        .then(() => {
            // Optionally send a confirmation message
            wanaDeposit = false;
            wanaWithdraw = false;
            wanaWithdrawDeatils = false;

            wanaDeposit = false;
            wanaWithdraw = false;
            wanaWithdrawDeatils = false;
            confirmDeposit = false;
            withdrawAmount = '0';
            withdrawMethod = 'none';

            wanaSend = false;
            toSend = 'none';
        })
        .catch((error) => {
            console.error('Failed to delete message:', error);
        });
        return;
    }
});


//all msgs 
bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    const userId = msg.from.id.toString();
    const text = msg.text || '';
    const messageId = msg.message_id;
    await connectRedis()
    
    //deposit
    if(depositUserId === chatId && wanaDeposit){
        if (isNaN(text)) {
            bot.sendMessage(chatId, `Pls send number and retry or exit!`, {reply_markup: JSON.stringify(closeall)})
            return;
        }
        
const depositMethods = {
    inline_keyboard: [
        [{ text: 'Venmo', callback_data: `depositVenmo_${chatId}_${text}` }],
        [{ text: 'Apple Pay', callback_data: `depositApple_${chatId}_${text}` }],
        [{ text: 'Cash App', callback_data: `depositCash_${chatId}_${text}` }],
        [{ text: 'Paypal', callback_data: `depositPaypal_${chatId}_${text}` }],
        [{ text: 'Zelle', callback_data: `depositZelle_${chatId}_${text}`}],
        [{ text: 'Exit ❎', callback_data: `exit` }]
    ]
};

       bot.sendMessage(chatId, `Now to deposit ${text} USD, Choose method 🔽`, {reply_markup: JSON.stringify(depositMethods)});
       
       wanaDeposit= false;
    }

    //withdraw
    if(withdrawUserId === chatId && wanaWithdraw){
        const key = `sportsbets:users:${chatId}`; 
        const existingUser = await redisClient.hGetAll(key);
        const balance = existingUser.balance;
        const username = existingUser.username;
        if (isNaN(text)) {
            bot.sendMessage(chatId, `Pls send number and retry or exit!`, {reply_markup: JSON.stringify(closeall)})
            return;
        }
        if(text === 0 || text < 0){
            bot.sendMessage(chatId, `Pls send number and retry or exit!`, {reply_markup: JSON.stringify(closeall)})
            return
        }
        if(text >  balance && balance === 'Not updated by admin' && balance === '0'){
            bot.sendMessage(chatId, `Not enought balance or balance not updated in bot!`)
            return;
        }
const withdrawMethods = {
    inline_keyboard: [
        [{ text: 'Venmo', callback_data: `withdrawVenmo_${chatId}_${text}` }],
        [{ text: 'Apple Pay', callback_data: `withdrawApple_${chatId}_${text}` }],
        [{ text: 'Cash App', callback_data: `withdrawCash_${chatId}_${text}` }],
        [{ text: 'Paypal', callback_data: `withdrawPaypal_${chatId}_${text}` }],
        [{ text: 'Zelle', callback_data: `withdrawZelle_${chatId}_${text}`}],
        [{ text: 'Crypto (BTC)', callback_data: `withdrawBTC_${chatId}_${text}`}],
        [{ text: 'Exit ❎', callback_data: 'exit' }]
    ]
};

       bot.sendMessage(chatId, `Now to withdraw ${text} USD, Choose method 🔽`, {reply_markup: JSON.stringify(withdrawMethods)});
       
       wanaWithdraw= false;
    }
});

//all deposit callbacks
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id.toString();
    const data = callbackQuery.data;
    const key = `sportsbets:users:${chatId}`; 
    await connectRedis()
    const existingUser = await redisClient.hGetAll(key);
    const balance = existingUser.balance;
    const username = existingUser.username;
    const [prefix, chatId2, text] = data.split('_');

    if (prefix === 'depositVenmo') {
        const confirmdepositmenu = {
            inline_keyboard: [
                [{ text: 'Confirm', callback_data: `confirmDeposit_${text}_${chatId}_Venmo` }],
                [{ text: 'Exit ❎', callback_data: 'close' }]
            ]
        };

       bot.sendMessage(chatId2, `<b>Deposit ${text} USD via Venmo</b>💵\n\nVenmo username to depost:\n\n@LV-locks\n
@HWXIV\n\n⚠️ Be sure to click on check deposit and send screenshot!`, {reply_markup: JSON.stringify(confirmdepositmenu), parse_mode: 'HTML'});
     return;
    }
    
    if (prefix === 'depositApple') {
        const confirmdepositmenu = {
            inline_keyboard: [
                [{ text: 'Confirm', callback_data: `confirmDeposit_${text}_${chatId}_ApplePay` }],
                [{ text: 'Exit ❎', callback_data: 'close' }]
            ]
        };

       bot.sendMessage(chatId2, `<b>Deposit ${text} USD via Apple Pay</b>💵\n\nApple Pay number to depost:\n\n+1 (949) 571-2626\n\n⚠️ Be sure to click on check deposit and send screenshot!`, {reply_markup: JSON.stringify(confirmdepositmenu), parse_mode: 'HTML'});
       return;
    }
    
    if (prefix === 'depositPayPal') {
        const confirmdepositmenu = {
            inline_keyboard: [
                [{ text: 'Confirm', callback_data: `confirmDeposit_${text}_${chatId}_Paypal` }],
                [{ text: 'Exit ❎', callback_data: 'close' }]
            ]
        };

       bot.sendMessage(chatId2, `<b>Deposit ${text} USD via PayPal</b>💵\n\nPayPal email to depost:\n\n<code>stinkyjhunter@hotmail.com</code>\n\n⚠️ Be sure to click on check deposit and send screenshot!`, {reply_markup: JSON.stringify(confirmdepositmenu), parse_mode: 'HTML'});
       return;
    }

    if (prefix === 'depositCash') {
        const confirmdepositmenu = {
            inline_keyboard: [
                [{ text: 'Confirm', callback_data: `confirmDeposit_${text}_${chatId}_CashApp` }],
                [{ text: 'Exit ❎', callback_data: 'close' }]
            ]
        };

       bot.sendMessage(chatId2, `<b>Deposit ${text} USD via Cash App</b>💵\n\nCash App details to depost:\n\n<code>$bellenmellon</code>\n\n⚠️ Be sure to click on check deposit and send screenshot!`, {reply_markup: JSON.stringify(confirmdepositmenu), parse_mode: 'HTML'});

       return;
    }

    if (prefix === 'depositZelle') {
        const confirmdepositmenu = {
            inline_keyboard: [
                [{ text: 'Confirm', callback_data: `confirmDeposit_${text}_${chatId}_Zelle` }],
                [{ text: 'Exit ❎', callback_data: 'close' }]
            ]
        };

       bot.sendMessage(chatId2, `<b>Deposit ${text} USD via Zelle</b>💵\n\nZelle email to depost:\n\n<code>stinkyjhunter@hotmail.com</code>\n\n⚠️ Be sure to click on check deposit and send screenshot!`, {reply_markup: JSON.stringify(confirmdepositmenu), parse_mode: 'HTML'});
       return;
    }
});

//all withdraw callbacks

bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id.toString();
    const data = callbackQuery.data;
    const key = `sportsbets:users:${chatId}`; 
    await connectRedis()
    const existingUser = await redisClient.hGetAll(key);
    const balance = existingUser.balance;
    const username = existingUser.username;
    const [prefix, chatId2, text] = data.split('_');


    if (prefix === 'withdrawVenmo') {
      bot.sendMessage(chatId, `Now, Send your Venmo username below to withdraw 🔽`, {reply_markup: JSON.stringify(closeall)})
      wanaWithdrawDeatils = true;
      withdrawMethod = 'Venmo';
      withdrawAmount = text;
      return;
    }
    
    if (prefix === 'withdrawApple') {
        bot.sendMessage(chatId, `Now, Send your Apple Pay Number below to withdraw 🔽`, {reply_markup: JSON.stringify(closeall)})
        wanaWithdrawDeatils = true;
        withdrawMethod = 'Apple Pay';
        withdrawAmount = text;
       return;
    }
    
    if (prefix === 'withdrawPayPal') {
        bot.sendMessage(chatId, `Now, Send your PayPal Email below to withdraw 🔽`, {reply_markup: JSON.stringify(closeall)})
        wanaWithdrawDeatils = true;
        withdrawMethod = 'Paypal';
        withdrawAmount = text;
       return;
    }

    if (prefix === 'withdrawCash') {
        bot.sendMessage(chatId, `Now, Send your CashApp details below to withdraw 🔽`, {reply_markup: JSON.stringify(closeall)})
        wanaWithdrawDeatils = true;
        withdrawMethod = 'Cash App';
        withdrawAmount = text;
       return;
    }

    if (prefix === 'withdrawZelle') {
        bot.sendMessage(chatId, `Now, Send your Zelle Email below to withdraw 🔽`, {reply_markup: JSON.stringify(closeall)})
        wanaWithdrawDeatils = true;
        withdrawMethod = 'Zelle';
        withdrawAmount = text;
       return;
    }

    if (prefix === 'withdrawBTC') {
        bot.sendMessage(chatId, `Now, Send your Bitcoin Address below to withdraw 🔽`, {reply_markup: JSON.stringify(closeall)})
        wanaWithdrawDeatils = true;
        withdrawMethod = 'Bitcoin';
        withdrawAmount = text;
       return;
    }
});


//wana withdraw details
bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    const userId = msg.from.id.toString();
    const text = msg.text || '';
    const messageId = msg.message_id;
    await connectRedis()
    const key = `sportsbets:users:${chatId}`; 
    const existingUser = await redisClient.hGetAll(key);
    const balance = existingUser.balance;
    const username = existingUser.username;
    
    //withdraw wana details
    if(wanaWithdrawDeatils && withdrawMethod !== 'none' && withdrawUserId && withdrawAmount !== '0'){
      bot.sendMessage(chatId, `Withdraw request sent, wait for approval and confirmation!`)
      bot.sendMessage(admin1, `Withdraw Request\n\nUsername: ${username}\nBalane on bot atm: ${balance}\n\nAmount to withdraw ${withdrawAmount} Via ${withdrawMethod}\n${withdrawMethod} Detils:\n hg${text}\n\nPls be sure that balance is same as your dashboard and after withdraw make sure to detect balance from bot and dashboard both!`)
      withdrawMethod = 'none';
      wanaWithdrawDeatils = false;
      withdrawAmount = '0';
    }
    
});

//confirm depsoit callback 
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id.toString();
    const data = callbackQuery.data;
    const key = `sportsbets:users:${chatId}`; 
    await connectRedis()
    const existingUser = await redisClient.hGetAll(key);
    const balance = existingUser.balance;
    const username = existingUser.username;
    const [prefix, amount, chatid2, method] = data.split('_');


    if(prefix === 'confirmDeposit'){
        const adminLink = `<a href="tg://user?id=${'1693228494'}">!</a>`;

        bot.sendMessage(chatId, `Please send screenshot of payment as proof below, Admin will confirm and add your balance ${adminLink} 🔒`)
        bot.sendMessage(admin1, `From ${chatId}, Username: ${username}\n\nDeposit request\n\nAmount: ${amount}\nMethod:\n${method}\n\nI have pinged you in that chat, pls go and review the proof of payment and update balance on dashboard & bot.`)

        return;
    }
 
});


// admin commands
bot.onText(/\/increase (.+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id.toString();
    const userId = match[1].trim(); // Extract the username from the command
    const reqbalance = parseFloat(match[2]);

    const key = `sportsbets:users:${userId}`; 
    const existingUser = await redisClient.hGetAll(key);
    const balance = parseFloat(existingUser.balance);
    const username = existingUser.username;
    
    if(balance === 'undefined'){
        bot.sendMessage(chatId, `Wrong userid, pls try again!`)
    }

    if(admin1 === chatId || amdin2 === chatId){
    await redisClient.hSet(key, {
        balance: balance + reqbalance,
    });
    bot.sendMessage(chatId, `Username: ${username}\nOld balance: ${balance} USD\n\nUpdated balance: ${reqbalance + balance} USD`)
    }
});

bot.onText(/\/decrease (.+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id.toString();
    const userId = match[1].trim(); // Extract the username from the command
    const reqbalance = parseFloat(match[2]);

    const key = `sportsbets:users:${userId}`; 
    const existingUser = await redisClient.hGetAll(key);
    const balance = parseFloat(existingUser.balance);
    const username = existingUser.username;
    
    if(admin1 === chatId || amdin2 === chatId){
    if(balance === 'undefined'){
        bot.sendMessage(chatId, `Wrong userid, pls try again!`)
    }

    await redisClient.hSet(key, {
        balance: balance - reqbalance,
    });
    bot.sendMessage(chatId, `Username: ${username}\nOld balance: ${balance} USD\n\nUpdated balance: ${balance - reqbalance} USD`)
    }

});

bot.onText(/\/change (.+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id.toString();
    const userId = match[1].trim(); // Extract the username from the command
    const reqbalance = parseFloat(match[2]);

    const key = `sportsbets:users:${userId}`; 
    const existingUser = await redisClient.hGetAll(key);
    const balance = parseFloat(existingUser.balance);
    const username = existingUser.username;
    
    if(admin1 === chatId || amdin2 === chatId){
    if(balance === 'undefined'){
        bot.sendMessage(chatId, `Wrong userid, pls try again!`)
    }

    await redisClient.hSet(key, {
        balance: reqbalance,
    });
    bot.sendMessage(chatId, `Username: ${username}\nOld balance: ${balance} USD\n\nUpdated balance: ${reqbalance} USD`)
    }

});

const boardcast = {
    inline_keyboard: [
        [{ text: 'Type msg', callback_data: 'boardcast' }],
        [{ text: 'Exit ❌', callback_data: 'close' }]
    ]
};

bot.onText(/\/send (.+)/, async (msg, match) => {
    const chatId = msg.chat.id.toString();
    const userId = match[1].trim(); // Extract the username from the command

    const key = `sportsbets:users:${userId}`; 
    const existingUser = await redisClient.hGetAll(key);
    const balance = parseFloat(existingUser.balance);
    const username = existingUser.username;
  
    if(admin1 === chatId || amdin2 === chatId){
        bot.sendMessage(chatId, `Write note below to send msg to ${userId}, Username: ${username}\n\nFirst type msg, then click on 'Type msg' button, once you sent your typed msg to this bot, it will sent there!`, {reply_markup: JSON.stringify(boardcast)})
        toSend = userId;
    }
});

bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id.toString();
    const data = callbackQuery.data;
    const key = `sportsbets:users:${chatId}`; 
    await connectRedis()
    const existingUser = await redisClient.hGetAll(key);
    const balance = existingUser.balance;
    const username = existingUser.username;
 
    if(data === 'boardcast'){
        bot.sendMessage(chatId, `Send text below, it will be sent asap! or cancel`, {reply_markup: JSON.stringify(closeall)})
        wanaSend = true;
        sendUserId = chatId;
    }
});


bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    const userId = msg.from.id.toString();
    const text = msg.text || '';
    const messageId = msg.message_id;
    await connectRedis()
    const key = `sportsbets:users:${chatId}`; 
    const existingUser = await redisClient.hGetAll(key);
    const balance = existingUser.balance;
    const username = existingUser.username;
    
    if(chatId === admin1 || chatId === amdin2){
        if(wanaSend && sendUserId === chatId && toSend !== 'none'){
          bot.sendMessage(toSend, `${text}`)
          wanaSend = false;
          toSend = 'none';
        }
    }
    
    
});

bot.onText(/\/username (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const username = match[1].trim(); // Extract the username from the command

    try {
        // Scan Redis for the key containing the username
        let cursor = 0;
        let userId = null;

        do {
            const scanResult = await redisClient.scan(cursor, { MATCH: 'sportsbets:users:*', COUNT: 100 });
            cursor = scanResult.cursor;

            for (const key of scanResult.keys) {
                const user = await redisClient.hGetAll(key);
                if (user.username === username) {
                    userId = user.userId;
                    break;
                }
            }

        } while (cursor !== '0' && !userId);

        if (userId) {
            bot.sendMessage(chatId, `The user ID for username "${username}" is: <code>${userId}</code>`, {parse_mode: 'HTML'});
        } else {
            bot.sendMessage(chatId, `No user found with the username: "${username}".`);
        }

    } catch (error) {
        console.error('Error fetching userId from Redis:', error);
        bot.sendMessage(chatId, 'An error occurred while processing your request. Please try again later.');
    }
});
