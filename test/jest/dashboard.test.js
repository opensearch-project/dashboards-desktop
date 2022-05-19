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
const dashboards = require('../../src/dashboards');
const CONFIG_TEST_PATH = path.join(__dirname, "config.test.json");

describe('Config Test', () => {
  it('Getting config', () => {
    let config = dashboards.getConfig(CONFIG_TEST_PATH);
    let mapping = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "ENDPOINT", "OSD_PATH"];

    mapping.forEach(function(map) {
        expect(map in config).toEqual(true);
    })
    
  });

  it('Setting config', () => {
    let mapping = ["AWS_ACCESS_KEY_ID"];
    mapping.forEach(async function(map) {
        //insert random integer 0-999
        let value = Math.floor(Math.random() * 1000);
        await dashboards.setConfig(map, value, ()=>{}, CONFIG_TEST_PATH);
        let config = await dashboards.getConfig(CONFIG_TEST_PATH);
        expect(config[map]).toEqual(value);
    })
    
  });

});