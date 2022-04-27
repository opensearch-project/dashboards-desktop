const { BrowserWindow } = require('electron')
const { spawn, exec } = require('child_process');
const fs = require("fs");
const path = require('path');

const CONFIG_PATH = path.join(__dirname,"config.json");

function getConfig() {
    let config = fs.readFileSync(CONFIG_PATH);
    config = JSON.parse(config.toString());
    return config;
}

function setConfig(key, value, callback) {
    console.log('setting Config a', key, value)
    let config = getConfig();
    config[key] = value;
    fs.writeFile(CONFIG_PATH, JSON.stringify(config), callback);
}


async function startProxy() {
  //get variables
  let config = getConfig();
  //export variables in command line
  for (let variable in config) {
      process.env[variable] = config[variable];
  }
  
  //start proxy
  var proxy = spawn('/usr/local/bin/aws-es-proxy', ['-endpoint', config.ENDPOINT, "-verbose"]);

  proxy.stdout.on('data', function(data) {
      data = JSON.parse(data.toString());
      console.log('stdout: ' + JSON.stringify(data));
  })

  proxy.stderr.on('data', function(data) {   
      console.log('stderr: ' + data.toString());
  })

  proxy.on('exit', function(code) {
      console.log('child process exited with code ' + code.toString());  
  })
  return;
}


exports.startProxy = startProxy;
exports.getConfig = getConfig;
exports.setConfig = setConfig;
