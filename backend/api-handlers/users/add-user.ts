import {
    CreateUserData,
    createUserRecord,
} from "$backend/repository/user-repository.ts";
import { CanManageUsers } from "$backend/rbac/permissions.ts";
import { guardHandler } from "$backend/rbac/authorizer.ts";
import { toCreated } from "$backend/api-responses.ts";
import { addUserSchema } from "$schemas/users.ts";
import { validateRequest } from "$schemas/mod.ts";
import { AddUserRequest } from "$schemas/users.ts";

export const handleAddUser = guardHandler(CanManageUsers.Create, async (
    req: Request,
): Promise<Response> => {
    const data = await req.json() as AddUserRequest;

    await validateRequest(addUserSchema, data);

    return toCreated(await createUserRecord(data as CreateUserData));
});
