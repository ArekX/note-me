import { assertEquals, assertStringIncludes } from "$std/assert/mod.ts";
import { createUserRecord } from "$backend/repository/user-repository.ts";
import {
  createFormRequest,
  createRequest,
  defineTest,
  sendRequest,
} from "../setup.ts";

defineTest("Home page", async (addStep, client) => {
  await addStep(
    "it shows login page when nobody is logged in.",
    async () => {
      const response = await sendRequest(client, createRequest("/"));
      const result = await response.text();
      const { status } = response;
      assertEquals(status, 200);
      assertStringIncludes(result, "Please login.");
    },
  );

  await addStep("login gets processed.", async () => {
    const request = createFormRequest("/", {
      username: "test",
      password: "user",
    });

    await createUserRecord({
      name: "Test user",
      username: "test",
      password: "user",
    });

    const response = await sendRequest(client, request);
    const { status } = response;
    assertEquals(status, 302);
    assertStringIncludes(response.headers.get("location") ?? "", "/app");
  });
});
