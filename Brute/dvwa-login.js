const puppeteer = require('puppeteer');
const fs = require('fs');
const { exec } = require('child_process');

const DVWA_URL = "http://10.115.2.9:4280/login.php";
const USERNAME = "admin";
const PASSWORD = "password"; // Falls dein DVWA-Passwort anders ist, hier anpassen

async function getSessionID() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Gehe zur Login-Seite
    await page.goto(DVWA_URL);

    // Fülle das Login-Formular aus
    await page.type('input[name="username"]', USERNAME);
    await page.type('input[name="password"]', PASSWORD);
    await page.click('input[type="submit"]');

    // Warte kurz, damit die Seite sich aktualisiert
    await page.waitForNavigation();

    // Extrahiere die Cookies
    const cookies = await page.cookies();
    const sessionCookie = cookies.find(cookie => cookie.name === 'PHPSESSID');

    if (sessionCookie) {
        console.log(`Session-ID gefunden: ${sessionCookie.value}`);

        // Speichere die Session-ID in eine Datei
        fs.writeFileSync('session.txt', sessionCookie.value);

        // Beende den Browser
        await browser.close();

        // Starte das Brute-Force-Skript
        exec('node brute_force.js', (error, stdout, stderr) => {
            if (error) {
                console.error(`Fehler: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`Stderr: ${stderr}`);
                return;
            }
            console.log(stdout);
        });

    } else {
        console.log("Session-ID konnte nicht gefunden werden.");
        await browser.close();
    }
}

getSessionID();
