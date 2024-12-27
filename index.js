const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const num = require('./numbers');
const wmsg = require('./message');
const fs = require('fs');

// Initialize WhatsApp Web client
const client = new Client({
    authStrategy: new LocalAuth(),
});

// Keep track of pending operations
let pendingOperations = num.length;
let dms = 2000;
let globtimestamp

const changedNum = num.map((number) => number.startsWith('+') ? number.slice(1) : number);

function logToFile(message) {
    // Get current time in UTC
    const now = new Date();
    
    // Adjust the time to GMT+4
    const gmtPlus4 = new Date(now.getTime() + (4 * 60 * 60 * 1000));  // Adding 4 hours
    
    // Format the date into YYYY-MM-DD HH:mm:ss
    const year = gmtPlus4.getFullYear();
    const month = String(gmtPlus4.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(gmtPlus4.getDate()).padStart(2, '0');
    const hours = String(gmtPlus4.getHours()).padStart(2, '0');
    const minutes = String(gmtPlus4.getMinutes()).padStart(2, '0');
    const seconds = String(gmtPlus4.getSeconds()).padStart(2, '0');
    
    const timestamp = `[${year}-${month}-${day}]---[${hours}:${minutes}:${seconds}]`;
    globtimestamp = timestamp

    // Append the log message to file
    fs.appendFileSync('logs.txt', `[${timestamp}] ${message}\n`);
}

// Function to send messages
async function sendMessages() {
    const rawNumbers = changedNum;

    const formattedNumbers = rawNumbers.map((number) => `${number}@c.us`);
    const message = wmsg;
    let i = 0;

    for (const number of formattedNumbers) {
        try {
            await client.sendMessage(number, `${i}, ${message}`); // Send the message
            logToFile(`Message sent to ${number}`);
            console.log(`${globtimestamp} Message sent to ${number}`);
            i++;
        } catch (err) {
            logToFile(`Failed to send message to ${number}: ${err}`);
            console.error(`${globtimestamp} Failed to send message to ${number}:`, err);
        } finally {
            pendingOperations--;
            checkIfDone(); // Check if all operations are complete
        }
        console.log(`${globtimestamp} Waiting ${dms / 1000} seconds before sending the next message...`);
        await delay(dms); // Add a delay between messages
    }
}

// Function to add a delay
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Function to check if all operations are complete
async function checkIfDone() {
    if (pendingOperations === 0) {
        logToFile('All operations complete. Waiting 15 seconds before shutdown...');
        console.log(`${globtimestamp} All operations complete. Waiting 15 seconds before shutdown...`);
        await delay(6000); // Wait for 6 seconds
        logToFile('15-second delay complete. Shutting down...');
        console.log(`${globtimestamp} 15-second delay complete. Shutting down...`);
        await client.destroy(); // Properly shut down the client
        logToFile('Client destroyed. Program has finished.');
        console.log(`${globtimestamp} Client destroyed. Program has finished.`);
        process.exit(0); // Exit the program
    }
}

// Event: Display QR code for login
client.on('qr', (qr) => {
    logToFile('Scan this QR code to log in:');
    console.log(`${globtimestamp} Scan this QR code to log in:`);
    qrcode.generate(qr, { small: true });
});

// Event: Successful login
client.on('ready', async () => {
    logToFile('WhatsApp client is ready!');
    console.log(`${globtimestamp} WhatsApp client is ready!`);
    await sendMessages();
});

// Event: Handle incoming messages
client.on('message', (message) => {
    logToFile(`Message received from ${message.from}: ${message.body}`);
    console.log(`${globtimestamp} Message received from ${message.from}: ${message.body}`);
});

// Event: Handle authentication failures
client.on('auth_failure', (msg) => {
    logToFile(`Authentication failed: ${msg}`);
    console.error(`${globtimestamp} Authentication failed:`, msg);
});

// Prevent premature shutdown
process.stdin.resume();

// Start the client
client.initialize();
