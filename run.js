// Used for testing and as an example.

var els = require("./index");

if (process.argv.length < 3) {
  return console.error("Specify the .ensime file as the first command line argument.");
}
var dotEnsime = process.argv[2];

els.setup(dotEnsime, "0.9.10-SNAPSHOT", "/tmp/ensime", "sbt", function(err, res) {
  if (err) return console.error(err);

  els.start(function(err, res) {
    if (err) return console.error(err);
    console.log("=================================");
    console.log("Ensime started on port: "+res.http);
  });
});

