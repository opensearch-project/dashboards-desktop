const path = require('path');
const dashboards = require('../src/dashboards');
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
        console.log('config', config);
        expect(config[map]).toEqual(value);
    })
    
  });

});