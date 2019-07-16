const fs = require("fs");
const https = require("https");

/**
 * Tests the whats new file to ensure changes have been made in the PR.
 */

// Check status on azure
if (!process.env["AZURE_PULLREQUESTID"]) {
    console.log("Not a PR, no need to check.")
    return;
}

// Compare what's new with the current one in the preview release folder.
const url = "https://rawgit.com/BabylonJS/Controls/master/dist/what's%20new.md";
https.get(url, res => {
    res.setEncoding("utf8");
    let oldData = "";
    res.on("data", data => {
        oldData += data;
    });
    res.on("end", () => {
        fs.readFile("./what's new.md", "utf-8", function(err, newData) {
            console.log(newData)
            if (err || oldData != newData) {
                return;
            }

            console.error("What's new file did not change.");
            process.exit(1);
        });
    });
});