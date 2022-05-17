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
function init() {
    addListeners();
}

// store name variable if exists
window.electron.onName(function (name) {
    let config = window.electron.getConfig(name);
    populateFields(config);
});

function getMapping() {
    return [{id: "name", key: "NAME"},
            {id: "awsAccessKeyId", key: "AWS_ACCESS_KEY_ID"},
            {id: "awsSecretAccessKey", key: "AWS_SECRET_ACCESS_KEY"},
            {id: "endpoint", key: "ENDPOINT"},
            {id: "osdPath", key: "OSD_PATH"}
    ]
}
async function populateFields(config) {
    let mapping = getMapping();
    for (map of mapping) {
        let input = document.getElementById(map.id);
        input.setAttribute("value", config[map.key]);
    }
}

function getNewConfig() {
    let mapping = getMapping();
    let config = {};
    mapping.forEach(function(map) {
        let input = document.getElementById(map.id); 
        config[map.key] = input.value;
    })
    return config;
}

function addListeners() {
    let submit = document.getElementById("submit");
    submit.addEventListener("click", async (event) => {
        event.preventDefault();
        let newConfig = getNewConfig();
        window.electron.setConfig(newConfig, closeWindow);
    })
}

function closeWindow() {
    window.electron.ipcRenderer.invoke("closeWindow");
}

init();

