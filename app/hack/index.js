const { getRegistrationToken } = require("../src/github");

(async () => {
    const now = new Date();

    await getRegistrationToken();

    const then = new Date();

    console.log("Took " + (then - now) / 1000 + " seconds");
})();
