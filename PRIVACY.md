# Security & Privacy

## General
Frolic does not collect any personal information about you, your computer, or anything else, other than what is necessary to connect you to F-Chat.

**The Frolic app does not send any of your data to its developers.** We are not interested in who your fursona is. Or who you talk to on the grown-up writing website. Or how many gigacats of RAM your hard drive can display. If you want to give us something (such as feature requests or bug reports) visit the [issues page](https://github.com/Frolic-chat/Frolic/issues) of our github.

## Connectivity
Frolic connects to the following hosts:

  * `f-list.net` – FChat, FList, profiles, character search, authentication, character images, etc.
  * `github.com` – Frolic [update checks](https://github.com/Frolic-chat/Frolic/electron/main.ts)
  * `easylist.to`, `adblockplus.org`, `adtidy.org`, `githubusercontent.com` – [ad blocker updates](https://github.com/Frolic-chat/Frolic/electron/blocker/blocker.ts)
  * `xariah.net` – [eicon updates](https://github.com/Frolic-chat/Frolic/learn/eicon/updater.ts)

Your character name, password, messages, and any other private data is only sent to `f-list.net`; the other services are queried anonymously.
Your IP address will be exposed to all of these services.

## Link Previews
When the 'Link Preview' feature is used, Frolic will connect to the URL being previewed and any other hosts that are linked from the page being previewed.

* Frolic uses [@ghostery/adblocker](https://github.com/ghostery/adblocker) to block as many ads and trackers as possible.
* Using the Link Preview feature will expose you to similar risks that opening a link in your web browser does.
* If you are concerned about your security or privacy, consider disabling the link preview feature in Frolic settings.
* In some cases Frolic uses 'proxy services' that help formatting Link Previews. For example:
  * Twitter previews are proxied through `api.fxtwitter.com`

## High-Quality Portraits
When 'High-Quality Portraits' feature is used, Frolic may connect to the following additional domains:

* `iili.io`
* `e621.net`
* `imgur.com`
* `freeimage.host`
* `redgifs.com`

If you are concerned about your security or privacy, consider disabling the high quality portraits feature in Frolic settings.

## Locally Stored Data
Frolic stores data on your computer. This data contains conversation logs, settings, cache, and other
information such as custom dictionary words. By default, the data is stored in:

| **Operating System** | **Data Path**                         |
|:---------------------|:--------------------------------------|
| Windows              | `%AppData%\fchat`                     |
| MacOS                | `~/Library/Application Support/fchat` |
| Linux                | `~/.config/fchat`                     |

F-List account usernames and passwords are stored in a secure datastore provided by your operating system or secret service.
For more information, see [electron safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage).
