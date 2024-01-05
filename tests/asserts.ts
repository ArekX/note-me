import { assertEquals } from "$std/assert/mod.ts";
import { DOMParser } from "./deps.ts";

export const assertTextContent = (
  html: string,
  selector: string,
  expected: string,
) => {
  const document = new DOMParser().parseFromString(html, "text/html");
  assertEquals(document?.querySelector(selector)?.textContent, expected);
};
