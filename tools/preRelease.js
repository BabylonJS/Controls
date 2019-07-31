const { exec } = require('child_process');

exec("npm publish --tag preview --access public", (err, stdout, stderr) => {
    if (err) {
        console.error(err);
        return;
    }

    console.log(stdout);
});
