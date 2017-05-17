require("./appium-setup");
var glob = require("glob");

var testRunType = process.env.TEST_RUN_TYPE;
const appiumVerion = process.env.APPIUM_VERSION;
var wd = require("wd");

exports.createDriver = function (caps, activityName) {
    console.log("CAPS " + caps);
    console.log("activityName " + activityName);
    if (!activityName) {
        activityName = "com.tns.NativeScriptActivity";
    }
    if (!caps) {
        caps = exports.getDefaultCapabilities();
    }

    var serverConfig = {
        host: "localhost",
        port: process.env.APPIUM_PORT || 4723
    };
    var driver = wd.promiseChainRemote(serverConfig);
    exports.configureLogging(driver);

    caps.app = exports.getAppPath();
    return driver.init(caps);
};

exports.getAppPath = function () {
    console.log("testRunType " + testRunType);
    if (testRunType.startsWith("android")) {
        console.log("GLOB: " + glob);
        var apks = glob.sync("platforms/android/build/outputs/apk/*.apk").filter(function (file) { return file.indexOf("unaligned") < 0; });
        return apks[0];
    } else if (testRunType === "ios-simulator") {
        var simulatorApps = glob.sync("platforms/ios/build/emulator/**/*.app");
        return simulatorApps[0];
    } else if (testRunType === "ios") {
        var deviceApps = glob.sync("platforms/ios/build/device/**/*.app");
        return deviceApps[0];
    } else {
        throw new Error("Incorrect test run type: " + testRunType);
    }
};

exports.getDefaultCapabilities = function () {
    if (testRunType === "android19") {
        return exports.caps.android19();
    } else if (testRunType === "android23") {
        return exports.caps.android23();
    } else if (testRunType === "android24") {
        return exports.caps.android24();
    } else if (testRunType === "ios-simulator") {
        return exports.caps.ios10();
    } else if (testRunType === "ios") {
        return exports.caps.ios10();
    } else {
        throw new Error("Incorrect test run type: " + testRunType);
    }
};

function log(message) {
    if (process.env.VERBOSE_LOG) {
        console.log(message);
    }
}

exports.configureLogging = function (driver) {
    driver.on("status", function (info) {
        log(info.cyan);
    });
    driver.on("command", function (meth, path, data) {
        log(" > " + meth.yellow + path.grey + " " + (data || ""));
    });
    driver.on("http", function (meth, path, data) {
        log(" > " + meth.magenta + path + " " + (data || "").grey);
    });
};

exports.caps = {
    android19: function () {
        return {
            browserName: "",
            "appium-version": appiumVerion,
            platformName: "Android",
            platformVersion: "4.4.2",
            deviceName: "Android Emulator",
            noReset: false, //Always reinstall app on Android
            app: undefined // will be set later
        };
    },
    android23: function () {
        return {
            browserName: "",
            "appium-version": appiumVerion,
            platformName: "Android",
            platformVersion: "6.0",
            deviceName: "Android Emulator",
            noReset: false, //Always reinstall app on Android
            app: undefined // will be set later
        };
    },
    android24: function () {
        return {
            browserName: "",
            "appium-version": appiumVerion,
            platformName: "Android",
            platformVersion: "7.0",
            deviceName: "Android Emulator",
            noReset: false, //Always reinstall app on Android
            app: undefined // will be set later
        };
    },
    ios92: function () {
        return {
            browserName: "",
            "appium-version": appiumVerion,
            platformName: "iOS",
            platformVersion: "9.2",
            deviceName: "iPhone 6",
            app: undefined // will be set later
        };
    },
    ios10: function () {
        return {
            browserName: "",
            "appium-version": appiumVerion,
            platformName: "iOS",
            platformVersion: "10.0",
            deviceName: "iPhone 7 100",
            app: undefined // will be set later
        };
    },
};

exports.getXPathElement = function (name) {
    var tempName = name.toLowerCase().replace(/\-/g, "");
    if (testRunType === "android") {
        return xpathAndroid(tempName, name);
    } else {
        return xpathiOS(tempName, name);
    }
};

function xpathAndroid(name) {
    switch (name) {
        case "activityindicator": return "android.widget.ProgressBar";
        case "button": return "android.widget.Button";
        case "datepicker": return "android.widget.DatePicker";
        case "htmlview": return "android.widget.TextView";
        case "image": return "org.nativescript.widgets.ImageView";
        case "label": return "android.widget.TextView";
        case "absolutelayout": return "android.view.View";
        case "docklayout": return "android.view.View";
        case "gridlayout": return "android.view.View";
        case "stacklayout": return "android.view.View";
        case "wraplayout": return "android.view.View";
        case "listpicker": return "android.widget.NumberPicker";
        case "listview": return "android.widget.ListView";
        case "progress": return "android.widget.ProgressBar";
        case "scrollview": return "android.view.View";
        case "hscrollview": return "org.nativescript.widgets.HorizontalScrollView";
        case "vscrollview": return "org.nativescript.widgets.VerticalScrollView";
        case "searchbar": return "android.widget.SearchView";
        case "segmentedbar": return "android.widget.TabHost";
        case "slider": return "android.widget.SeekBar";
        case "switch": return "android.widget.Switch";
        case "tabview": return "android.support.v4.view.ViewPager";
        case "textview":
        case "textfield": return "android.widget.EditText";
        case "timepicker": return "android.widget.TimePicker";
        case "webview": return "android.webkit.WebView";
    }

    throw new Error("This " + name + " does not appear to to be a standard NativeScript UI component.");
}

function xpathiOS(name) {
    switch (name) {
        case "activityindicator": return createIosElement("ActivityIndicator");
        case "button": return createIosElement("Button");
        case "datepicker": return createIosElement("DatePicker");
        case "htmlview": return createIosElement("TextView");
        case "image": return createIosElement("ImageView");
        case "label": return "TNSLabel";
        case "absolutelayout": return createIosElement("View");
        case "docklayout": return createIosElement("View");
        case "gridlayout": return createIosElement("View");
        case "stacklayout": return createIosElement("View");
        case "wraplayout": return createIosElement("View");
        case "listpicker": return createIosElement("Picker");
        case "listview": return createIosElement("Table");
        case "progress": return createIosElement("ProgressIndicator");
        case "scrollview": return createIosElement("ScrollView");
        case "hscrollview": return createIosElement("ScrollView");
        case "vscrollview": return createIosElement("ScrollView");
        case "searchbar": return createIosElement("SearchField");
        case "segmentedbar": return createIosElement("SegmentedControl");
        case "slider": return createIosElement("Slider");
        case "switch": return createIosElement("Switch");
        case "tabview": return "XCUIElementTypeTabBarItem";
        case "textview": return createIosElement("TextView");
        case "textfield": return createIosElement("TextField");
        case "timepicker": return createIosElement("DatePicker");
        case "webview": return createIosElement("WebView");
    }

    throw new Error("This " + name + " does not appear to to be a standard NativeScript UI component.");
}

function createIosElement(element) {
    let xCUIElementType = "XCUIElementType";
    let uIA = "UIA";
    let elementType;

    if (this.settings.platformVersion.toString().startsWith("10")) {
        elementType = xCUIElementType;
    } else {
        elementType = uIA;
    }

    return elementType + element;
}

