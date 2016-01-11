Ensime Launcher JS
==================

NPM module that downloads and starts the ensime server.


Usage
-----
Install the ensime-launcher-js library

    npm install --save ensime-launcher-js

and use it in your code to start the ensime server:

    require('ensime-launcher-js');
    var dotEnsime = "/path/to/your/.ensime"
    els.setup(
      dotEnsime,
      "0.9.10-SNAPSHOT",  // ensime version
      "/tmp/ensime",      // directory that can be used to install ensime
      "sbt",              // sbt command (must be already installed)
      function(err, res) {
        if (err) return console.error(err);

        els.start(function(err, res) {
          if (err) return console.error(err);
          console.log("=================================");
          console.log("Ensime started on port: "+res.http);
        });
      });


API
---
The following functions are available:

  - *setup(dotEnsime, ensimeVersion, ensimeDirector, sbtCmd, callback)*:
      Must be called before any other function to initialize the ensime launcher.

  - *start(callback)*:
      Start ensime. Will download ensime (once) if not already installed.

  - *update(callback)*:
      (Re)download the newest version of ensime.


Credits to
----------
- https://github.com/ensime/ensime-server
- https://github.com/ensime/ensime-atom/blob/master/lib/ensime-startup.coffee
- https://gist.github.com/fommil/4ff3ad5b134280de5e46