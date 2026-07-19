import assert from "node:assert/strict";
import test from "node:test";
import { appOrigin } from "./auth.ts";
import { authenticate } from "./store.ts";

const environment = process.env as Record<string, string | undefined>;

test("demo authentication requires an explicit password and is disabled in production", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalPassword = process.env.DEMO_PASSWORD;
  try {
    delete process.env.DEMO_PASSWORD;
    assert.equal(authenticate("minh@ledgerly.app", "anything"), null);

    process.env.DEMO_PASSWORD = "local-only-password";
    environment.NODE_ENV = "development";
    assert.equal(
      authenticate("minh@ledgerly.app", "local-only-password")?.role,
      "Administrator",
    );

    environment.NODE_ENV = "production";
    assert.equal(
      authenticate("minh@ledgerly.app", "local-only-password"),
      null,
    );
  } finally {
    if (originalNodeEnv === undefined) delete environment.NODE_ENV;
    else environment.NODE_ENV = originalNodeEnv;
    if (originalPassword === undefined) delete process.env.DEMO_PASSWORD;
    else process.env.DEMO_PASSWORD = originalPassword;
  }
});

test("production redirects require and normalize the configured application URL", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  try {
    environment.NODE_ENV = "production";
    delete process.env.NEXT_PUBLIC_APP_URL;
    assert.throws(() => appOrigin("https://attacker.example/path"));

    process.env.NEXT_PUBLIC_APP_URL = "https://portal.example.com/base";
    assert.equal(
      appOrigin("https://attacker.example/path"),
      "https://portal.example.com",
    );
  } finally {
    if (originalNodeEnv === undefined) delete environment.NODE_ENV;
    else environment.NODE_ENV = originalNodeEnv;
    if (originalAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  }
});
