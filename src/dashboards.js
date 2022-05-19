/*
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements.  See the NOTICE file
distributed with this work for additional information
regarding copyright ownership.  The ASF licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License.  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an
"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied.  See the License for the
specific language governing permissions and limitations
under the License.    
*/
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
