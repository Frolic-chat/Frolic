# ABOUT
This project aims to keep a recent, active, bug-free chat client built upon the primary feature set of F-Chat Rising. Users who are familiar with Rising should feel right at home using this client.  
# FAQ
## What happened to F-Chat Rising?
No one knows. It's unprofessional and rude to speculate. All we know is that they were absent from the Rising repository for over 6 months prior to the repository unexpectedly disappearing. Additionally, the owner's bot's profile was updated sometime around February 8, 2025, and was subsequently been blocked from viewing due to "shocking and harmful content". As of March 15, the owner has not edited the profile to lift the block.

## What features do you offer over the old F-Chat Rising client?
We have a full changelog [available here!](https://github.com/FireUnderTheMountain/fchat-risinger/blob/master/CHANGELOG.md)
For a brief overview:
* Kemonomimi species identification
* Support for more anthro species
* The adblocker for the image viewer popup actually works now
* The broken youtube proxy is removed, although the replacement doesn't currently play sound so you still have to open youtube videos like normal
* Removal of the old maintainer's AI chatbot
* Speciesless profiles are no longer considered human by default
* Bugfixes & backend touch-ups
* The developer is active :)

## Any relation to the Horizon client?
We're both derivatives of the same defunct F-Chat Rising client, which itself is developed from the official F-Chat desktop client. Horizon was forked from our project, as we were the only up-to-date F-Chat Rising fork anyone could find at the time. Both projects are available under the Expat License (commonly called the "MIT License").

The lead developer of this project regularly participates in discussion and code review on Horizon and submits code improvements where appropriate. Meanwhile, this project also pulls relevant improvements from Horizon.

There is no hostility between these projects; we're happy Horizon exists, and we're sure they're thankful we were around to preserve the original Rising codebase.

## What makes this project different from Horizon?
* In terms of end-user experience, this project seeks to establish sane, helpful, and unobtrusive defaults so you can run the application as-is. The intent of this client is to enhance the original client with features that stay out of the way and let the user control their own experience.

    It's yet to be seen how Horizon will implement feature additions, but Horizon's lead developer has expressed interest in having more user-controllable options for a high amount of customization. In this way, we operate with different _primary_ goals, even though both projects desire a high-quality experience for our users.

* For development style, this project focuses on feature-based branches which test changes and implement minor improvements over long periods of time - then merges the completed feature into the main branch so you have a fully-implemented new feature to play with.

    Horizon uses a single development branch to merge multiple features together for a testing period.

    Of course, repository management hardly matters as long as the finished product is good.

* For coding style, this project operates without enforcement of a particular coding standard, favoring pertinent in-line commentary and clarity of code so other contributors can discern the intent.

    When submitting code to this project, the only code-style test you'll have to pass is, "Can the lead developer understand what my code is trying to do just by reading it?" All submissions will undergo review and discussion; code is never accepted immediately. You may have to make formatting or layout changes for clarity, but you also may not. Communication is a must, but don't worry - the lead dev is a patient person and enjoys working with others. :)

    Horizon enforces a particular code format using the "opinionated" [Prettier](https://prettier.io/docs/) nodejs module.

    It's not "wrong" to favor either consistency or readability over the other, it's entirely preference. And most importantly, it doesn't affect the usability of the finished chat client in any way.

###
Ultimately, we operate with different standards and move towards different goals. Our project makes only minimal changes necessary to offer improvement, preserving parts of the code that don't need to be tampered with.
# 

## How can I help improve this project?
There are two ways to get started making a contribution.
* Submit an idea to the [issue tracker](https://github.com/FireUnderTheMountain/fchat-risinger/issues). Include how ever many or few details as you want. Ideas that fit the general theme of "enhanced chat client" will get attention. Ideas that are simple and unobtrusive will also get fast attention. And if you include an offer to do the bulk of the code-work yourself, it's _even more likely_ to get attention. :)
* **Alternatively:** Fork the project, make some commits, and submit a pull request with an explanation of what your changes accomplish. Simple bug fixes, logic improvements and code improvements are mostly likely to be accepted quickly. If your code is in line with project goals, it will be merged into a new branch for testing and development.
