Ensime Launcher JS
==================

NPM module that downloads and starts the [ENSIME server](https://github.com/ensime/ensime-server). ENSIME is a cross editor platform
for the scala programming language.


Usage
-----
Install the ensime-launcher-js library

    npm install --save ensime-launcher-js

and use it in your code to start the ensime server:

    var Launcher = require("./index");
    var dotEnsime = "/path/to/your/.ensime"
    var esl = new Launcher(
      dotEnsime,
      "0.9.10-SNAPSHOT",  // ensime version
      "/tmp/ensime",      // directory that can be used to install ensime
      "sbt");            // sbt command (must be already installed)

    esl.start(function(err, res) {
      if (err) return console.error(err);
      console.log("=================================");
      console.log("Ensime started on port: "+res.http);
    });



API
---
The following functions are available:

  - *start(callback)*:
      Start ensime. Will download ensime (once) if not already installed.

  - *update(callback)*:
      (Re)download the newest version of ensime.

  - *stop(callback)*:
      Stop ensime.


Credits to
----------
- https://github.com/ensime/ensime-server
- https://github.com/ensime/ensime-atom/blob/master/lib/ensime-startup.coffee
- https://gist.github.com/fommil/4ff3ad5b134280de5e46