# Frolic Devtools

## About
Frolic Devtools is intended to help test scenarios where you'd normally be at the mercy of the server.

For example, you may spoof an incoming broadcast to test which chat frames it appears in. You may also spoof a fictional character to receive a chat message from.

These tools are not included in the production builds of the application. The exclusion happens automatically. (By "automatic" we mean webpack figures it out... so don't break webpack.)

## Caveats
These tools are not intended to be used without understanding exactly what signals they emit, and what the code that receives those signals does.

**The use of this interface in any way may interfere with your ability to use the application as intended.**

**The command spoofer deliberately allows you to enter invalid data specifically to test for scenarios where that may occur. Frolic Devtools will not sanitize your input for you. If you issue commands that damage your logs or put your client in a strange state, you are responsible.**

These tools are in their infancy and may not do exactly what you think they do. You are welcome to contribute additional behavior or configuration for them; Having a robust set of testing tools makes it easier to build a bug-free application.

These tools may cause side-effects. These side-effects may be long lasting or impossible to undo. For example:
* Spoofing chat messages may add those spoofed messages your local chat logs.
* Spoofing characters in any way may add invalid data to your local caches, such as the cache of user profiles.
* Convincing the application that it has incoming data may cause it to download that data into its own cache or somewhere on your computer.
* Using these tools in any way that violates the connected server's rules could get you temporarily or permanently banned from the service!

## FAQ
#### What controls the enablement of these tools?
The integration was specifically designed so these files are not included in a production build. The NODE_ENV variable exposed by nodejs controls some codepaths that are then optimized out of the build by webpack. Webpack's tree-shaking feature removes unnecessary code paths and files. In the production build, none of the devtools components are called upon and therefore, webpack tree-shakes them out of the final code.

For more information about how this feature works in webpack: https://webpack.js.org/guides/production/#specify-the-mode

#### Are these tools dangerous?
These testing tools reveal functionality that shouldn't be handed out lightly, but isn't inherently dangerous. It should not be included in an app without the user being able to know specifically how it works. Requiring the user to know how to setup a development environment is a basic test to pass for someone interested in making use of these capabilities.
