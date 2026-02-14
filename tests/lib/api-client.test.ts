// posterboy - ApiClient diagnostic test

import { describe, test, expect } from "bun:test";
import { ApiClient } from "../../src/lib/api";

describe("ApiClient Diagnostics", () => {
  test("ApiClient can be imported", () => {
    expect(ApiClient).toBeDefined();
    expect(typeof ApiClient).toBe("function");
  });

  test("ApiClient instance has me method", () => {
    const client = new ApiClient("test-key");
    console.log("client type:", typeof client);
    console.log("client constructor:", client.constructor.name);
    console.log("client.me type:", typeof client.me);
    console.log("client.listUsers type:", typeof client.listUsers);
    console.log("proto:", Object.getOwnPropertyNames(Object.getPrototypeOf(client)));
    expect(typeof client.me).toBe("function");
  });

  test("ApiClient prototype has all methods", () => {
    const proto = ApiClient.prototype;
    const methods = Object.getOwnPropertyNames(proto).filter(n => n !== "constructor");
    console.log("prototype methods:", methods);
    expect(methods).toContain("me");
    expect(methods).toContain("listUsers");
    expect(methods).toContain("createUser");
    expect(methods).toContain("postText");
  });
});
