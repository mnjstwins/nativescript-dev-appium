#!/usr/bin/env node
var fs = require("fs");
var path = require("path");
var portastic = require("portastic");
var child_process = require("child_process");

var verbose = process.env.npm_config_loglevel === "verbose";
var testRunType = process.env.npm_config_runtype || "android24";
var appiumVersion = process.env.npm_config_appiumversion || "1.6.3";

function log(message) {
    if (verbose) {
        console.log(message);
    }
}

function logOut(line, force) {
    if (verbose || force) {
        process.stdout.write(line);
    }
}

function logErr(line, force) {
    if (verbose || force) {
        process.stderr.write(line);
    }
}

var appium = "appium";
var mocha = "mocha";
if (process.platform === "win32") {
    appium = "appium.cmd";
    mocha = "mocha.cmd";
}

var projectDir = path.dirname(path.dirname(__dirname));
var pluginAppiumBinary = path.join(__dirname, "node_modules", ".bin", appium);
var projectAppiumBinary = path.join(projectDir, "node_modules", ".bin", appium);
var appiumBinary = appium;
if (fs.existsSync(pluginAppiumBinary)) {
    console.log("Using plugin-local Appium binary.");
    appiumBinary = pluginAppiumBinary;
} else if (fs.existsSync(projectAppiumBinary)) {
    console.log("Using project-local Appium binary.");
    appiumBinary = projectAppiumBinary;
} else {
    console.log("Using global Appium binary.");
}

var pluginMochaBinary = path.join(__dirname, "node_modules", ".bin", mocha);
var projectMochaBinary = path.join(projectDir, "node_modules", ".bin", mocha);
var mochaBinary = projectMochaBinary;
if (fs.existsSync(pluginMochaBinary)) {
    mochaBinary = pluginMochaBinary;
}

log("Mocha found at: " + mochaBinary);

mochaOpts = [
    "--recursive",
    "e2e-tests"
];

var server, tests;
portastic.find({ min: 9200, max: 9300 }).then(function (ports) {
    var port = ports[0];
    server = child_process.spawn(appiumBinary, ["-p", port, "--no-reset", "--log-level", "info:info"], { detached: false });

    server.stdout.on("data", function (data) {
        logOut("" + data);
    });
    server.stderr.on("data", function (data) {
        logErr("" + data);
    });
    server.on('exit', function (code) {
        server = null;
        logOut('Appium Server process exited with code ' + code);
        process.exit();
    });

    waitForOutput(server, /listener started/, 60000).then(function () {
        process.env.APPIUM_PORT = port;
        tests = child_process.spawn(mochaBinary, mochaOpts, { shell: true, detached: false, env: getTestEnv() });
        tests.stdout.on('data', function (data) {
            logOut("" + data, true);
        });
        tests.stderr.on("data", function (data) {
            logErr("" + data, true);
        });
        tests.on('exit', function (code) {
            console.log('Test runner exited with code ' + code);
            if (process.platform === "win32") {
                // The default kill doesn't kill the sub-children...
                killPid(server.pid);
            } else {
                server.kill();
            }
            server = null;
            tests = null;
            process.exit(code);
        });
    }, function (err) {
        console.log("Test runner could not start: " + err);
        server.kill();
        process.exit(1);
    });
});

process.on("exit", shutdown);
process.on('uncaughtException', shutdown);

function shutdown() {
    if (tests) {
        if (process.platform === "win32") {
            killPid(tests.pid);
        } else {
            tests.kill();
        }
        tests = null;
    }
    if (server) {
        if (process.platform === "win32") {
            killPid(server.pid);
        } else {
            server.kill();
        }
        server = null;
    }
}

function killPid(pid) {
    var output = child_process.execSync('taskkill /PID ' + pid + ' /T /F');
}

function getTestEnv() {
    var testEnv = JSON.parse(JSON.stringify(process.env));
    testEnv.TEST_RUN_TYPE = testRunType;
    testEnv.APPIUM_VERSION = appiumVersion;
    if (verbose) {
        testEnv.VERBOSE_LOG = "true";
    }
    return testEnv;
}

function waitForOutput(process, matcher, timeout) {
    return new Promise(function (resolve, reject) {
        var abortWatch = setTimeout(function () {
            process.kill();
            console.log("Timeout expired, output not detected for: " + matcher);
            reject(new Error("Timeout expired, output not detected for: " + matcher));
        }, timeout);

        process.stdout.on("data", function (data) {
            console.log("DATA" + data);

            var line = "" + data;
            if (matcher.test(line)) {
                clearTimeout(abortWatch);
                resolve();
            }
        });
    });
}
