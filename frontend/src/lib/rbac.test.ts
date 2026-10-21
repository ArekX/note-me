import { describe, expect, it } from "vitest";
import { CanManageUsers, canAccessSettings, canRole, roleNames } from "./rbac";

describe("rbac", () => {
    it("mirrors the backend role definitions", () => {
        expect(roleNames).toEqual(["admin", "user"]);
        expect(canRole("admin", CanManageUsers.Update)).toBe(true);
        expect(canRole("user", CanManageUsers.Update)).toBe(false);
        expect(canAccessSettings("admin")).toBe(true);
        expect(canAccessSettings("user")).toBe(false);
    });
});
