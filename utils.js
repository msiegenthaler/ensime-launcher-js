var fs = require("fs");

function createDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
}

/** Extract a value from the .ensime content. Does not cover all cases! */
function readDotEnsimeValue(from, key) {
  var r = new RegExp("\\s*:" + key + " \"([^\"]*)\"\\s*$", "m");
  var m = from.match(r);
  if (m) return m[1];
  else return undefined;
}

/** Extract a value from the .ensime content. Does not cover all cases! */
function readDotEnsimeArray(from, key) {
  var r = new RegExp("\\s*:" + key + " \\(([^\\)]*)\\)\\s*$", "m");
  var m = from.match(r);
  if (m) {
    return m[1].
    match(/"([^"])*"/g).
    map(function(e) {
      return e.match(/"([^"]*)"/)[1];
    });
  }
  else return undefined;
}

module.exports = {
  createDir: createDir,
  readDotEnsimeValue: readDotEnsimeValue,
  readDotEnsimeArray: readDotEnsimeArray
};