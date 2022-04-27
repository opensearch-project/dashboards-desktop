const { BrowserWindow } = require('electron')
const { spawn, exec } = require('child_process');
const fs = require("fs");
const path = require('path');
const { start } = require('repl');

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

async function getOSDStatus() {
    let osStatus = await curlCommand('curl localhost:9200');
    let osdStatus = await curlCommand('curl localhost:5601/api/status');
    let statuses = {};
    if (osStatus) {
      statuses["os"] = "green"
    }
  
    if (osdStatus) {
      statuses["osd"] = JSON.parse(osdStatus).status.overall.state;
    }
    return statuses;
  }
  
  function curlCommand(command) {
    return new Promise(function(resolve, reject) {
          
      exec(command, (error, stdout, stderr) => {
          if (error) {
            //console.error(`exec error: ${error}`);
            resolve(null);
          } else {
            console.log('osd status', stdout);
            resolve(stdout);
          }
          
        });
    }) 
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

async function startOSD() {
    //get variables
    let config = getConfig();
    console.log('config', config);

    //start osd
    var osd = spawn(config.OSD_PATH + '/bin/opensearch-dashboards');

    osd.stdout.on('data', function(data) {
        data = JSON.parse(data.toString());
        console.log('stdout: ' + JSON.stringify(data));
    })

    osd.stderr.on('data', function(data) {
        
        console.log('stderr: ' + data.toString());
    })

    osd.on('exit', function(code) {
        console.log('child process exited with code ' + code.toString());
        
    })
}

exports.startProxy = startProxy;
exports.getConfig = getConfig;
exports.setConfig = setConfig;
exports.startOSD = startOSD;
exports.getOSDStatus = getOSDStatus;