# Frolic Devtools

## License
Copyright 2025, Fire Under the Mountain (https://github.com/FireUnderTheMountain)

This file is part of Frolic Devtools.

Frolic Devtools package is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License version 3 as published by the Free Software Foundation.

Frolic Devtools is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.

## About
Frolic Devtools is intended to help test scenarios where you'd normally be at the mercy of the server.

For example, you may spoof an incoming broadcast to test which chat frames it appears in.

You may also spoof a fictional character to receive a chat message from.

# License
These tools are published under the GPLv3 license. They are **not** built into the production build, thereby preserving the object code from GPL virality.

## Caveats
**The use of this interface in any way may interfere with your ability to use the chat client as normal.**

**The command spoofer deliberately allows you to enter invalid data specifically to test for scenarios where that may occur. Frolic Devtools will not sanitize your input for you. If you issue commands that damage your logs or put your client in a strange state, you are responsible.**

These tools are in their infancy and may not do exactly what you think they do.

These tools are not intended to be used without understanding exactly what signals they emit, and what the code that receives those signals does.

These tools may cause side-effects. These side-effects may be long lasting or impossible to undo. For example:
* Spoofing chat messages may add those spoofed messages your local chat logs.
* Spoofing characters in any way may add invalid data to your local caches, such as your profile or match-maker cache.
