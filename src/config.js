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