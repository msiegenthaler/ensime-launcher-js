// Used for testing and as an example.

var Launcher = require("./index");

if (process.argv.length < 3) {
  return console.error("Specify the .ensime file as the first command line argument.");
}
var dotEnsime = process.argv[2];

var esl = new Launcher(dotEnsime, "0.9.10-SNAPSHOT", "/tmp/ensime", "sbt");

esl.start(function(err, res) {
  if (err) return console.error(err);
  console.log("=================================");
  console.log("Ensime started on port: "+res.http);
  console.log("=================================");

  setTimeout(function() {
    esl.stop(function(err) {
      if (err) return console.error(err);
      console.log("=================================");
      console.log("Ensime now stopped.");
      console.log("=================================");
    })
  }, 2000);
});

