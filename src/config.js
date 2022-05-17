const path = require('path');
const fs = require("fs");
const CONFIG_PATH = path.join(__dirname, "config.json");

function getConfig(name, configPath=CONFIG_PATH) {
    let config = fs.readFileSync(configPath);
    config = JSON.parse(config.toString());
    if (name) {
        return config[name] || {};
    } else {
        return config;
    }
}

function setConfig(config, callback, configPath=CONFIG_PATH) {
    let oldConfig = fs.readFileSync(configPath);
    oldConfig = JSON.parse(oldConfig.toString());
    oldConfig[config.NAME] = config;
    fs.writeFile(configPath, JSON.stringify(oldConfig), callback);
}


exports.getConfig = getConfig;
exports.setConfig = setConfig;