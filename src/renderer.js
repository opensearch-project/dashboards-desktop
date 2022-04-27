function getMapping() {
    return [{id: "awsAccessKeyId", key: "AWS_ACCESS_KEY_ID"},
            {id: "awsSecretAccessKey", key: "AWS_SECRET_ACCESS_KEY"},
            {id: "endpoint", key: "ENDPOINT"},
            {id: "osdPath", key: "OSD_PATH"}
    ]
}
function init() {
    window.config = {};
    window.config = window.electron.getConfig();
    addListeners();
    populateFields();
}

async function populateFields() {
    let config = window.config;
    let mapping = getMapping();
    for (map of mapping) {
        let input = document.getElementById(map.id);
        input.setAttribute("value", config[map.key])
    }
}

function addListeners() {
    let listeners = getMapping();
    listeners.forEach(function(listener) {
        let input = document.getElementById(listener.id);
        input.addEventListener('blur', (event) => {
            
            if (window.config[listener.key] != input.value) {
                window.config[listener.key] = input.value
                //add in success for save file config
                window.electron.setConfig(listener.key, input.value, ()=>{});
            }
        })
    })
    
    let submit = document.getElementById("submit");
    submit.addEventListener("click", async (event) => {
        event.preventDefault();
        console.log(event);
        await window.electron.startProxy();
    })
}


init();

