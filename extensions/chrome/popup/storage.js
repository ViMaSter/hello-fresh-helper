const setData = (key, value) => {
    ({key: value}, function() {
        console.log(`Stored: "${key}": "${value}"`);
    });
};

const getData = (keys, callback) => {
    (keys, callback);
};

window.onload = () => {
    const keys = ["field", "order"];
    keys.forEach(key => {
        Array.from(document.querySelectorAll(`input[type=radio][name=${key}]`)).forEach(element => {
            element.addEventListener("change", () => {
                chrome.storage.sync.set({[key]: element.value});
            })
        })

        chrome.storage.sync.get([key], (values) => {
            if (Object.keys(values).length <= 0)
            {
                return;
            }
            document.querySelector(`#${key}-${values[key]}`).checked = true;
        })
    });
};