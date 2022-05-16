let config = {};
function getMapping() {
    return [{id: "awsAccessKeyId", key: "AWS_ACCESS_KEY_ID"},
            {id: "awsSecretAccessKey", key: "AWS_SECRET_ACCESS_KEY"},
            {id: "endpoint", key: "ENDPOINT"},
            {id: "osdPath", key: "OSD_PATH"}
    ]
}
function init() {
    addListeners();
    populateFields();
}

async function populateFields() {
    config = window.electron.getConfig();
    let profile = document.getElementById("profile");
    profile.innerHTML = "";

    let options = Object.keys(config).map(function(name) {
        return `<option value="${name}">${name}</option>`
    });
    profile.innerHTML += options.join('');

}

function getActiveConfig() {
    let profile = document.getElementById("profile");
    var name = profile.options[profile.selectedIndex].value;
    console.log('name', name);
    return config[name] || null;
}

function addListeners() {
    let addConfig = document.getElementById("addConfig");
    addConfig.addEventListener("click", async (event) => {
        event.preventDefault();
        window.electron.ipcRenderer.invoke("openConfig");

    })
    let editConfig = document.getElementById("editConfig");
    editConfig.addEventListener("click", async (event) => {
        event.preventDefault();
        var name = profile.options[profile.selectedIndex].value;
        window.electron.ipcRenderer.invoke("openConfig", name);
    })

    let submit = document.getElementById("submit");
    
    submit.addEventListener("click", async (event) => {
        event.preventDefault();

        //get active profile config
        let activeConfig = getActiveConfig();
        console.log(activeConfig);

        await window.electron.startProxy(activeConfig);
        await window.electron.startOSD(activeConfig);
        waitForServer();
    })
}


async function waitForServer() {
    let osdStatus = await window.electron.getOSDStatus();
    console.log(osdStatus);
    if (osdStatus["os"] == "green" && osdStatus["osd"] == "green") {
        window.electron.ipcRenderer.invoke("swapURL", "http://localhost:5601");
    } else {
        setTimeout(waitForServer, 1000 * 5);
    }
}

window.electron.onRefresh(function (event, args) {
    populateFields();
});


init();

