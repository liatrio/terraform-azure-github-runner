import { v4 as uuidv4 } from "uuid";

import { createRegistrationToken, listIdleGitHubRunners } from "./github.js";
import { createKeyVaultSecret, createVM, deleteVM, deleteKeyVaultSecret, listAzureRunnerVMs } from "./azure/index.js";

export const createRunner = async () => {
    const token = await createRegistrationToken();

    const name = `gh-runner-${uuidv4()}`;

    await createKeyVaultSecret(name, token);
    await createVM(name);

    return name;
};

export const deleteRunner = async (name) => {
    await Promise.all([
        deleteKeyVaultSecret(name),
        deleteVM(name),
    ]);
};

/* warm pool states
    github            azure         description
    online, idle   -  succeeded  -  obvious
    offline, idle  -  succeeded  -  gh runner config is finished registering, but gh does not see the runner online yet
    unregistered   -  creating   -  VM is being created, has not started custom data script
    unregistered   -  succeeded  -  Period of time between VM starting custom data script and registering as runner
*/
export const getRunnerWarmPool = async () => {
    const [githubRunners, azureRunnerVMs] = await Promise.all([
        listIdleGitHubRunners(),
        listAzureRunnerVMs(),
    ]);

    return azureRunnerVMs
        .filter((vm) => {
            const githubRunner = githubRunners.find((runner) => runner.name === vm.name);

            return githubRunner || vm.provisioningState === "Succeeded" || vm.provisioningState === "Creating";
        })
        .map((vm) => vm.name);
};
