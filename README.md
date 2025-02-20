# MyDealz Deal Alarm Advanced

**Advanced Deal Alarm Notification for [MyDealz.de](https://www.mydealz.de)**

Have you ever wished for more Configuration Options on the MyDealz Deal Alarm?<br>
Or did you receive the Deal Alarm too late?<br>
This project, is exactly what you are looking for<br>
<br>

### Example E-Mail Notification
Only E-Mail Notifications are currently supported<br>
<img src="assets/screenshot.jpg" width="75%" />

## Table of Contents
- [MyDealz Deal Alarm Advanced](#mydealz-deal-alarm-advanced)
    - [Example E-Mail Notification](#example-e-mail-notification)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
    - [Prerequirements](#prerequirements)
    - [Download](#download)
    - [Setup](#setup)
  - [Usage](#usage)
    - [Run regularly (Recommended)](#run-regularly-recommended)
    - [Configuration File settings.conf](#configuration-file-settingsconf)
      - [Global Configuration](#global-configuration)
      - [Searchterm Configuration](#searchterm-configuration)
  - [Disclaimer](#disclaimer)
  - [License](#license)

## Installation

### Prerequirements
* Residential IP (Either run the script on a home device e.g. Raspberry Pi or configure a Residential Proxy in the Configuration File)
* [Node.js](https://nodejs.org) installed
* [Mailutils](https://www.digitalocean.com/community/tutorials/how-to-install-and-configure-postfix-as-a-send-only-smtp-server-on-ubuntu-20-04) installed (or another local running SMTP Server)

### Download
```bash
git clone https://github.com/TalkLounge/mydealz-deal-alarm-advanced
cd mydealz-deal-alarm-advanced
npm install
```

### Setup

* Copy ```settings.conf.example``` to ```settings.conf```
* Modify ```settings.conf``` based on your needs

## Usage

Each time the script will be executed, it runs trough the newest deals, until it reaches a deal that has been already checked at the last execution

```bash
npm start
```

### Run regularly (Recommended)

**Linux**<br>
With Cronjobs<br>
Runs every 5 Minutes Daily from 06:00 to 01:55 o'clock (Recommended)

```bash
crontab -e

*/5 6-23,0-1 * * * cd ~/mydealz-notification/ && npm start
```

**Windows**<br>
With [Task Scheduler](https://www.windowscentral.com/how-create-automated-task-using-task-scheduler-windows-10)


### Configuration File settings.conf

Get inspired by my personal [settings.conf](TalkLounge's%20Personal%20settings.conf)

**TOML Format**<br>
The Configuration File ```settings.conf``` uses the TOML format<br>
Validate the TOML format every time the ```settings.conf``` is modified: [https://www.toml-lint.com](https://www.toml-lint.com/)
```toml
globalConfiguration1 = ""
globalConfiguration2 = true

# Comment

globalConfiguration3 = 32 # Comment


[[searchterm]]
titleContains = "XBOX"
price = 255

[[searchterm]]
titleContains = "PS5"
titleContainsNot = ["MediaMarkt", "Saturn"]
```

#### Global Configuration

| Key             | Value (Type) | Beispiel                                                             | Beschreibung                                                   |
| --------------- | ------------ | -------------------------------------------------------------------- | -------------------------------------------------------------- |
| apiCooldownMs   | number       | 500                                                                  | Cooldown zwischen MyDealz API Calls                            |
| emailSender     | string       | "MyDealz Deal Notification <mydealz-deal-notification@myServer.com>" | E-Mail Server von dem die Notification E-Mails gesendet werden |
| emailReceiver   | string       | "myMail@example.com"                                                 | Empfänger der Notification E-Mails                             |
| notifyOnError   | boolean      | true                                                                 | Sende Notification E-Mail bei Fehler im Skript                 |
| logNotification | boolean      | true                                                                 | Logge Notification E-Mails in die Konsole                      |
| proxyUrl        | string       | "socks5://user:password@10.0.0.1:1234"                               | Residential Proxy (Socks / HTTPS / HTTP)                       |

#### Searchterm Configuration

Every new Searchterm must start with ```[[searchterm]]```

| Key                      | Value (Type) | Beispiel                                    | Beschreibung                                                                               |
| ------------------------ | ------------ | ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| label                    | string       | "Akkuschrauber wollte ich noch kaufen"      | Kein Filter Kriterium, wird nur in der Benachrichtigungs E-Mail verwendet                  |
| titleContains            | string       | "Bahn Gutschein"                            | Deal Titel muss "Bahn Gutschein" enthalten                                                 |
| titleContains            | string array | ["Bahn", "Gutschein"]                       | Deal Titel muss Bahn und Gutschein enthalten                                               |
| titleContainsNot         | string       | "Lokal"                                     | Deal Titel darf nicht Lokal enthalten                                                      |
| titleContainsNot         | string array | ["Lokal", "München"]                        | Deal Titel darf nicht Lokal oder München enthalten                                         |
| titleRegex               | string       | '\b(1[0-4][0-9]\|150)% cashback\b'          | Deal Titel muss mit dem Regex matchen [Für fortgeschrittene Anwender] (Verwende ' statt ") |
| titleRegex               | string array | ['\b(1[0-4][0-9]\|150)% cashback\b', '\d+'] | Deal Titel muss mit den Regex matchen [Für fortgeschrittene Anwender] (Verwende ' statt ") |
| user                     | string       | "Tedesco"                                   | Deal muss von Nutzer Tedesco sein                                                          |
| userNot                  | string       | "Harrik_See"                                | Deal darf nicht von Nutzer Harrik_See sein                                                 |
| userNot                  | string array | ["Harrik_See", "volljuristen", "bruno1096"] | Deal darf nicht von Nutzer Harrik_See, volljuristen oder bruno1096 sein                    |
| price                    | number       | 2654.05                                     | Deal muss 2654.05€ oder weniger kosten                                                     |
| category                 | string       | Elektronik                                  | Deal muss in der Kategorie Elektronik sein                                                 |
| category                 | string array | ["Elektronik", "Smart Home"]                | Deal muss in der Kategorie Elektronik oder Smart Home sein                                 |
| temperature              | number       | 100                                         | Deal muss mindestens 100 Grad haben                                                        |
| temperatureWithinMinutes | number       | 60                                          | Deal muss die angegebenen Grad innerhalb von 60 Minuten erreichen                          |

## Disclaimer

This Project is inofficial, so it might break at any time. Use it on your own risk! Don't use it in production!

Scraping may be against the TOS

I'm not affiliated with MyDealz or the 6Minutes Media GmbH

## License

[MIT](LICENSE)