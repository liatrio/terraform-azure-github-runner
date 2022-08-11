const {v4: uuidv4} = require("uuid");

const {createVM, deleteVM} = require("../src/azure");

(async () => {
    // const name = "gh-runner-" + uuidv4();

    const now = new Date();

    await createVM();
    // await deleteVM("gh-runner-7bd69278-7796-40d1-9efb-30868d4e2406");

    const then = new Date();

    console.log("Took " + (then - now) / 1000 + " seconds");
})();
