const { setTimeout } = require("timers/promises");
const { createRunner, deleteRunner } = require("../src/runner");

(async () => {
    const now = new Date();

    const name = await createRunner();

    console.log("Created runner", name);

    await setTimeout(30 * 1000);

    const runners = await getRunners();

    runners.runners.forEach(runner => {
        console.log(runner.name, runner.status, runner.busy);        
    });

    await deleteRunner(name);

    const then = new Date();

    console.log("Took " + (then - now) / 1000 + " seconds");
})();
