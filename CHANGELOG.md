# Changelog

## Next?
* Sensible UI simplification to prevent sensory overload and let you focus on your friends and their terrible memes.
* Remove broadcasts from logs; At least don't ping all convos (the noise!!!)
* Better way to display points of interest between characters. Less "yes/no" and more "Here's where you overlap, here's where there might be contention"

## Release 0.6
* Added setting to receive notifications when friends/bookmarks log in
* Added setting to receive notifications when friends/bookmarks send a message in a channel (configurable per-channel!)
* Notification settings with similar purpose have been grouped together. Further adjustments are still needed to the overall settings layout.
* The adblocker for the image popup works now!
* The channel member list and friends list no longer wig out when moving between PMs and channels
* Broken YouTube proxy removed; videos will play in the popup now, but they play muted 😒
* Alternative themes had their colors updated
* Fixed a bug where notechecker would still check for notes even if it was disabled
* Touch-ups to Kemonomimi matching
* Quieted some spammy application logs
* Updates to backend components
* Moved some fixed strings into the localization database.

Thank you to [FatCatClient](https://github.com/FatCatClient) for their contributions to keeping F-Chat up to date with modern features.


## Release 0.5
* Kemonomimi now match much more favorably in many circumstances. See the [Pull Request](https://github.com/Frolic-chat/Frolic/pull/3) for details.
* Adjustments to species categories in preparation for hybrid-species matching improvements
* Fixed a rare log-deletion oversight from vanilla F-Chat.
* Empty species are no longer considered human by default; they need some kind of decisive indicator such as "Humans Only" partner preference.
* Build fixes in preparation for Electron update

For legacy F-Chat Rising changelogs, see the [legacy changelog](https://github.com/Frolic-chat/Frolic/blob/master/CHANGELOG-legacy.md)
