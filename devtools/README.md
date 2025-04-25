# Frolic Devtools

## License
Copyright 2025, Fire Under the Mountain (https://github.com/FireUnderTheMountain)

This file is part of Frolic Devtools.

Frolic Devtools package is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License version 3 as published by the Free Software Foundation, with this exception/clarification: These source code files hosted alongside other source code files not licensed under the GPL is not considered a "combined" work and does not dictate all source code files be distributed by the terms of the GPL.

Frolic Devtools is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.


## About
Frolic Devtools is intended to help test scenarios where you'd normally be at the mercy of the server.

For example, you may spoof an incoming broadcast to test which chat frames it appears in.

You may also spoof a fictional character to receive a chat message from.


# License
These tools are published under the GPLv3 license. They are **not** built into the production build, thereby preserving the object code from GPL virality. See below FAQ for more information.


## Caveats
**The use of this interface in any way may interfere with your ability to use the chat client as normal.**

**The command spoofer deliberately allows you to enter invalid data specifically to test for scenarios where that may occur. Frolic Devtools will not sanitize your input for you. If you issue commands that damage your logs or put your client in a strange state, you are responsible.**

These tools are in their infancy and may not do exactly what you think they do.

These tools are not intended to be used without understanding exactly what signals they emit, and what the code that receives those signals does.

These tools may cause side-effects. These side-effects may be long lasting or impossible to undo. For example:
* Spoofing chat messages may add those spoofed messages your local chat logs.
* Spoofing characters in any way may add invalid data to your local caches, such as your profile or match-maker cache.


# FAQ
#### How does distributing GPL code in a primarily Expat license codebase work?
As long as the GPL source files are not intermingled with non-GPL source files there are no addition burdens. The only burden is on redistributing combined files (such as a program compiled from both GPL+other license source). An object containing GPL code and all its sources would have to be distributed under GPL terms, regardless of what other licenses may apply to it.

#### Is this entire codebase GPL now?
No, these GPL licensed components are not integrated into a production build - when you compile a production version of the app, the object produced while these GPL source files are in the repo is identical to the object produced when they are not. The GPL code is not included in the output object and does not affect the output object at all.

The integration was specifically designed so the files only intermingle during a development build. The NODE_ENV variable exposed by nodejs controls some codepaths that are then optimized out of the build by webpack. Webpack's tree-shaking feature removes unnecessary code paths and files. In the production build, none of the GPL components are called upon and therefore, webpack never includes them.

For more information about how this feature works in webpack: https://webpack.js.org/guides/production/#specify-the-mode

However, if you **distribute** a compiled development build, you **do** need to abide by the terms of the GPL (since the GPL licensed devtools are a part of it). However, this is unlikely to be a burden since the development build is usually created on-the-fly during testing and is not distributed to another party; they will build their own from source when they need to do their own testing.

#### But WHY?
These testing tools reveal functionality that shouldn't be handed out lightly, but isn't inherently dangerous. It should not be included in an app without the user being able to know specifically how it works. Therefore, the requirement that a user can get the source code is a direct solution.

#### What about the changes to the non-GPL files?
Those are added as Expat licensed to keep the production build GPL-free.
