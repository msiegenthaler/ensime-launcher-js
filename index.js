var spawn = require("child_process").spawn;
var exec = require("child_process").exec;
var fs = require("fs");
var path = require("path");
var createDir = require("./utils").createDir;
var readDotEnsimeValue = require("./utils").readDotEnsimeValue;
var readDotEnsimeArray = require("./utils").readDotEnsimeArray;

function Launcher(dotEnsime, ensimeVersion, installDir, sbtCmd) {
  this.dotEnsime = dotEnsime;
  this.ensimeVersion = ensimeVersion;
  this.installDir = installDir;
  this.sbtCmd = sbtCmd;

  this.classpathFile = installDir + path.sep + "ensime.classpath";
  this.ensimeCache = path.dirname(dotEnsime) + path.sep + ".ensime_cache";
  this.sbtVersion = "0.13.9";
  this.maxWaitMs = 30000; //max 5min startup time for ensime-server
}

/** Update ensime to the specified version. Can also be used to fix installations.
 * @param output {out: Stream, err: Stream}
 * @return nothing */
Launcher.prototype.update = function(output, callback) {
  console.log("Updating ensime-server.");
  fs.unlinkSync(this.classpathFile);
  this.install(output, callback);
};

Launcher.prototype.install = function(output, callback) {
  console.log("Installing ensime-server " + this.ensimeVersion + " to " + this.installDir);
  createDir(this.installDir);
  createDir(this.installDir + path.sep + "project");

  var dotEnsimeContents = fs.readFileSync(this.dotEnsime, "utf-8");
  var scalaVersion = readDotEnsimeValue(dotEnsimeContents, "scala-version");
  console.log("Using scala version " + scalaVersion);

  // Generate build.sbt
  var buildSbtContents = generateBuildSbt(scalaVersion, this.ensimeVersion, this.classpathFile);
  fs.writeFileSync(this.installDir + path.sep + "build.sbt", buildSbtContents);
  // Generate build.properties
  var buildPropertiesContents = "sbt.version=" + this.sbtVersion;
  fs.writeFileSync(this.installDir + path.sep + "project" + path.sep + "build.properies", buildPropertiesContents);

  //Execute sbt
  var sbt = spawn(this.sbtCmd, ["-Dsbt.log.noformat=true", "saveClasspath", "clean"], {
    cwd: this.installDir
  });
  sbt.stdout.pipe(output.out);
  sbt.stderr.pipe(output.err);
  sbt.on("close", function(code) {
    if (code != 0) callback("SBT exited with code " + code);
    callback(false);
  });
  sbt.stdin.end();
};

function generateBuildSbt(scalaVersion, ensimeVersion, target) {
  return "" +
    "import sbt._\n" +
    "import IO._\n" +
    "import java.io._\n" +
    "scalaVersion := \"" + scalaVersion + "\"\n" +

    "ivyScala := ivyScala.value map { _.copy(overrideScalaVersion = true) }\n" +

    "// we don't need jcenter, so this speeds up resolution\n" +
    "fullResolvers -= Resolver.jcenterRepo\n" +
    "// allows local builds of scala\n" +
    "resolvers += Resolver.mavenLocal\n" +
    "// for java support\n" +
    "resolvers += \"NetBeans\" at \"http://bits.netbeans.org/nexus/content/groups/netbeans\"\n" +
    "// this is where the ensime-server snapshots are hosted\n" +
    "resolvers += Resolver.sonatypeRepo(\"snapshots\")\n" +

    "libraryDependencies ++= Seq(\n" +
    "  \"org.ensime\" %% \"ensime\" % \"" + ensimeVersion + "\"\n" +
    ")\n" +
    "dependencyOverrides ++= Set(\n" +
    "  \"org.scala-lang\" % \"scala-compiler\" % scalaVersion.value,\n" +
    "  \"org.scala-lang\" % \"scala-library\" % scalaVersion.value,\n" +
    "  \"org.scala-lang\" % \"scala-reflect\" % scalaVersion.value,\n" +
    "  \"org.scala-lang\" % \"scalap\" % scalaVersion.value\n" +
    ")\n" +

    "val saveClasspathTask = TaskKey[Unit](\"saveClasspath\", \"Save the classpath to a file\")\n" +
    "saveClasspathTask := {\n" +
    "  val managed = (managedClasspath in Runtime).value.map(_.data.getAbsolutePath)\n" +
    "  val unmanaged = (unmanagedClasspath in Runtime).value.map(_.data.getAbsolutePath)\n" +
    "  val out = file(\"" + target + "\")\n" +
    "  IO.write(out, (unmanaged ++ managed).mkString(File.pathSeparator))\n" +
    "}";
}

/** Start ensime.
 * @param output {out: Stream, err: Stream}
 * @return {http: Int} */
Launcher.prototype.start = function(output, callback) {
  if (this.ensimeProcess) return callback("Already running.");

  this.getClasspath(output, function(err, classpath) {
    if (err) return callback(err);
    console.log("Starting ensime-server for " + this.dotEnsime);
    this.ensimeProcess = startFromClasspath(output, this.dotEnsime, this.ensimeCache, classpath, function(err) {
      if (err) return callback(err);
      console.log("Waiting for ensime-server to start.");
      waitForPort(this.ensimeCache, this.maxWaitMs, callback);
    }.bind(this));
  }.bind(this));
};

Launcher.prototype.getClasspath = function(output, callback) {
  if (fs.existsSync(this.classpathFile)) {
    //already dowloaded ensime and its dependencies
    var contents = fs.readFileSync(this.classpathFile);
    callback(false, contents);
  }
  else {
    //need to download ensime-server first
    console.log("Need to install ensime-server first. Doing that now...\n");
    output.out.write("Need to download ENSIME first.");
    this.install(output, function(err) {
      if (err) return callback(err);
      output.out.write("Downloaded ENSIME.\n");
      var contents = fs.readFileSync(this.classpathFile);
      callback(false, contents);
    }.bind(this));
  }
};

function startFromClasspath(output, dotEnsime, ensimeCache, classpath, callback) {
  var dotEnsimeContents = fs.readFileSync(dotEnsime, "utf-8");
  var javaHome = readDotEnsimeValue(dotEnsimeContents, "java-home");
  var javaCmd = javaHome + path.sep + "bin" + path.sep + "java";
  var javaFlags = readDotEnsimeArray(dotEnsimeContents, "java-flags");
  console.log("Using JVM flags " + javaFlags.join(" "));

  createDir(ensimeCache);

  var toolsJar = javaHome + path.sep + "lib" + path.sep + "tools.jar";
  var args = ["-classpath", toolsJar + path.delimiter + classpath];
  args = args.concat(javaFlags);
  args.push("-Densime.config=" + dotEnsime);
  args.push("org.ensime.server.Server");
  var p = spawn(javaCmd, args);
  p.stdout.pipe(output.out);
  p.stderr.pipe(output.err);
  p.on("close", function(code) {
    console.log("Ensime server exited with code " + code);
  });
  p.stdin.end();

  var replied = false;
  p.on("error", function(err) {
    if (!replied) callback(err);
    replied = true;
  });
  p.stdout.on("data", function() {
    if (!replied) callback(false);
    replied = true;
  });
  return p;
}

function waitForPort(ensimeCache, maxMs, callback) {
  if (maxMs < 0) callback("Timeout waiting for ensime-server to start.");
  var httpFile = ensimeCache + path.sep + "http";
  try {
    var port = fs.readFileSync(httpFile);
    callback(false, {
      http: parseInt(port, 10)
    });
  }
  catch (e) {
    var t = 300;
    setTimeout(function() {
      waitForPort(ensimeCache, maxMs - t, callback);
    }, t);
  }
}

/** Stop ensime. */
Launcher.prototype.stop = function(callback) {
  if (this.ensimeProcess) {
    console.log("Stopping ensime process (" + this.ensimeProcess.pid + ")");
    this.ensimeProcess.kill();
    callback(false);
  }
  else callback(false);
};

/** Gets rid of a running ensime process even if it was not started here. */
Launcher.prototype.cleanup = function(callback) {
  try {
    var httpFile = this.ensimeCache + path.sep + "http";
    var portString = fs.readFileSync(httpFile);

    try {
      // Kill process holding the port
      var port = parseInt(portString, 10);
      exec("lsof -i :" + port + " | grep LISTEN | awk '{print $2}' | xargs kill -9");
      console.info("Killed process holding port " + port);
    }
    catch (e) {
      //ignore
    }
    finally {
      fs.unlinkSync(httpFile);
      console.log("Deleted http-port file.");
    }
  }
  catch (e) {
    //ignore
  }

  try {
    fs.unlinkSync(this.ensimeCache + path.sep + "port");
    console.log("Deleted port file.");
  }
  catch (e) {}

  callback(false);
};

/** Looks for a running ensime and returns the port it runs on. */
Launcher.prototype.ports = function(callback) {
  var httpFile = this.ensimeCache + path.sep + "http";
  try {
    var port = fs.readFileSync(httpFile);
    callback(false, {
      http: parseInt(port, 10)
    });
  }
  catch (e) {
    callback(true);
  }
};

module.exports = Launcher;