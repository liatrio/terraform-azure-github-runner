import { v4 as uuidv4 } from "uuid";

import { createRegistrationToken } from "./github.js";
import { createKeyVaultSecret, createVM, deleteVM, deleteKeyVaultSecret } from "./azure/index.js";

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
