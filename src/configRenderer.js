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

