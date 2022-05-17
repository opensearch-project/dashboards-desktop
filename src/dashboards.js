

const { BrowserWindow } = require('electron')
const { spawn, exec } = require('child_process');
const fs = require("fs");
const path = require('path');

const http = require('http');

const superagent = require('superagent');

async function getOSDStatus() {
    let statuses = {};
    try {
        const osStatus = await apiRequest('localhost:9200');
        const osdStatus = await apiRequest('localhost:5601/api/status');
        if (osStatus.name) {
            statuses["os"] = "green"
        }
    
        if (osdStatus) {
            statuses["osd"] = osdStatus.status.overall.state;
        }
    } catch (e) {
    }

    return statuses;
  }
  
  
  async function apiRequest(url) {
    // Make request
    const {body} = await superagent.get(url)      
    // Show response data
    return body;
  }

async function startProxy(config) {
  //export variables in command line
  for (let variable in config) {
      process.env[variable] = config[variable];
  }
  
  //start proxy
  var proxy = spawn('/usr/local/bin/aws-es-proxy', ['-endpoint', config.ENDPOINT, "-verbose"]);

  proxy.stdout.on('data', function(data) {
      data = JSON.parse(data.toString());
  })

  proxy.stderr.on('data', function(data) {   
  })

  proxy.on('exit', function(code) {
  })
  return;
}

async function startOSD(config) {
    //start osd
    var osd = spawn(config.OSD_PATH + '/bin/opensearch-dashboards');
  
    osd.stdout.on('data', function(data) {
        data = JSON.parse(data.toString());
    })
  
    osd.stderr.on('data', function(data) {
    })
  
    osd.on('exit', function(code) {
    })
}

exports.startProxy = startProxy;

exports.startOSD = startOSD;
exports.getOSDStatus = getOSDStatus;
