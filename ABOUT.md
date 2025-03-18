# ABOUT
Frolic aims to keep a stable, bug-free F-Chat client built upon the primary feature set of F-Chat Rising. Users who are familiar with Rising should feel right at home with Frolic. The primary, immediate goal of Frolic is to refine Rising's match-making to encourage community and roleplay between players where Rising might have discouraged it.  

# FAQ

## What happened to F-Chat Rising?
No one knows. What we do know is that the maintainer was absent from the Rising repository for over 6 months prior to it unexpectedly going offline. Additionally, the f-list profile of the maintainer's bot was updated sometime around February 8, 2025, and was subsequently blocked from viewing due to a "shocking and harmful content violation". As of March 17, the owner has not edited the profile to lift the block. Speculating on what's going on with real people is rude and unprofessional, so we won't go any further than the facts.

## What features does Frolic offer over the old F-Chat Rising client?
We have a full changelog [available here!](https://github.com/Frolic-chat/Frolic/blob/master/CHANGELOG.md)
For a brief overview:
* More options to be notified when your friends/bookmarks are active
* The adblocker for the image viewer popup actually works now
* The broken youtube proxy is removed, although the replacement doesn't currently play sound so you still have to open youtube videos like normal
* Removal of the old maintainer's AI chatbot
* Kemonomimi species identification
* Support for more anthro species
* Speciesless profiles are no longer considered human by default
* Bugfixes & backend touch-ups
* The developer is active :)

## Are there any big features I can look forward to in Frolic's future?
Sure, I have a lot of things I'd like to get done.
* UI _adjustments_ (not an overhaul!) to put the focus back on your messages and channels.
* Match-making display improvements to better portray how you overlap with other players.
* Maybe some day... a way of relaying interest without the baggage of a "first message"

## Any relation to the Horizon client?
Both Frolic and Horizon are derivatives of the same defunct F-Chat Rising client, which itself is developed from the official F-Chat desktop client. Horizon was forked from Frolic, as we were the only up-to-date F-Chat Rising fork anyone could find at the time. Both projects are available under the Expat License (commonly called the "MIT License").

The lead developer of Frolic regularly participates in discussion and code review on Horizon and submits code improvements where appropriate. Meanwhile, Frolic also pulls relevant improvements from Horizon to keep our client up-to-date.

There is no hostility between these projects; We're happy Horizon exists, and we're sure they're thankful for our contributions.

## What makes Frolic different from Horizon?
It's likely that Frolic and Horizon will maintain feature parity for an extended period of time.

* In terms of end-user experience, there may never be much difference. Frolic seeks to establish sane, helpful, and unobtrusive defaults so you can run the application as-is. The intent of Frolic is to enhance the original client with features that stay out of the way and let the user control their own experience.

    It's yet to be seen how Horizon will implement feature additions, but Horizon's lead developer has expressed interest in having more user-controllable options for a high amount of customization. In this way, we operate with different _primary_ goals, even though both projects desire an enjoyable experience for our users.

* If you want to work with developers to improve the client, there's a few distinctions between the projects, but you shouldn't let these differences sway your decision in which you use.

    Frolic focuses on feature-based branches which test changes and implement minor improvements over long periods of time - then merges the completed feature into the main branch so everyone can it can go live in the next release. Frolic makes only minimal changes necessary to offer improvement, preserving parts of the code that don't need to be tampered with.

    When submitting code to Frolic, the only style test you'll have to pass is, "Can the lead developer understand what my code is trying to do just by reading it?" All submissions undergo review and discussion; code is never accepted immediately. You may be asked to make formatting or layout changes for clarity. We rely on good communication to keep things moving, but don't worry - the lead dev is a patient person and enjoys working with others to polish submissions to perfection. :) Frolic operates without enforcement of a particular coding standard, favoring pertinent in-line commentary and clarity of code so other contributors will be able to discern the intent far into the future.

    Horizon uses a single development branch to merge multiple features together for a general testing period. For coding style, Horizon enforces a consistent code format using the self-proclaimed "opinionated" [Prettier](https://prettier.io/docs/) nodejs module.

    Both projects accept issue reports, feature requests, and code contributions from the general public. It's yet to be seen how either project address low-quality code submissions, as nothing of note has happened this early in these project's lives.

###
Ultimately, both projects operate with different standards and move towards different goals from the same starting point. If you need a concise way to think about it, consider them sister projects - similar but distinct.
# 

## How can I help improve Frolic?
There are two ways to help out:
* Submit an idea to the [issue tracker](https://github.com/Frolic-chat/Frolic/issues). Include how ever many or few details as you want. Ideas that fit the general theme of "enhanced chat client" will get attention. Ideas that are simple and unobtrusive will also get attention. And if you include an offer to do the bulk of the code-work yourself, it's _even more likely_ to get attention. :)
* **Alternatively:** Fork the project, make some commits, and submit a pull request with an explanation of what your changes accomplish. Simple bug fixes, logic improvements and code improvements are mostly likely to be accepted quickly. If your code is in line with project goals, it will be merged into a new branch for further development.
