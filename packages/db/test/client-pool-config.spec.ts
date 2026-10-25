import { describe, expect, it } from "bun:test";
import { resolvePoolConfig } from "../src/client";
import { LOCAL_HOSTS } from "../src/local-hosts";

describe("LOCAL_HOSTS", () => {
	it("includes bracketed and unbracketed loopback addresses", () => {
		expect(LOCAL_HOSTS.has("localhost")).toBe(true);
		expect(LOCAL_HOSTS.has("127.0.0.1")).toBe(true);
		expect(LOCAL_HOSTS.has("::1")).toBe(true);
		expect(LOCAL_HOSTS.has("[::1]")).toBe(true);
		expect(LOCAL_HOSTS.has("0.0.0.0")).toBe(true);
		expect(LOCAL_HOSTS.has("example.com")).toBe(false);
	});
});

describe("resolvePoolConfig", () => {
	it("returns raw connection string for local hosts", () => {
		const hosts = [
			"postgresql://postgres:postgres@localhost:5432/crm",
			"postgresql://postgres:postgres@127.0.0.1:5432/crm",
			"postgresql://postgres:postgres@[::1]:5432/crm",
			"postgresql://postgres:postgres@0.0.0.0:5432/crm",
		];

		for (const url of hosts) {
			expect(resolvePoolConfig(url, false)).toBe(url);
			expect(resolvePoolConfig(url, true)).toBe(url);
		}
	});

	it("verifies certificates by default for nonlocal connections", () => {
		const plainUrl = "postgresql://postgres:postgres@db.example.com:5432/crm";
		expect(resolvePoolConfig(plainUrl, false)).toEqual({
			connectionString: plainUrl,
			ssl: { rejectUnauthorized: true },
		});
	});

	it("preserves operator specified sslmode verification when not opted out", () => {
		const requireUrl =
			"postgresql://postgres:postgres@db.example.com:5432/crm?sslmode=require";
		const verifyFullUrl =
			"postgresql://postgres:postgres@db.example.com:5432/crm?sslmode=verify-full";
		const verifyCaUrl =
			"postgresql://postgres:postgres@db.example.com:5432/crm?sslmode=verify-ca";

		expect(resolvePoolConfig(requireUrl, false)).toBe(requireUrl);
		expect(resolvePoolConfig(verifyFullUrl, false)).toBe(verifyFullUrl);
		expect(resolvePoolConfig(verifyCaUrl, false)).toBe(verifyCaUrl);
	});

	it("allows self-signed certificates when opted out without strict verification", () => {
		const plainUrl = "postgresql://postgres:postgres@db.example.com:5432/crm";
		expect(resolvePoolConfig(plainUrl, true)).toEqual({
			connectionString: plainUrl,
			ssl: { rejectUnauthorized: false },
		});

		const requireUrl =
			"postgresql://postgres:postgres@db.example.com:5432/crm?sslmode=require";
		expect(resolvePoolConfig(requireUrl, true)).toEqual({
			connectionString:
				"postgresql://postgres:postgres@db.example.com:5432/crm?sslmode=no-verify",
			ssl: { rejectUnauthorized: false },
		});
	});

	it("preserves strict operator verification even when allowSelfSigned is true", () => {
		const verifyFullUrl =
			"postgresql://postgres:postgres@db.example.com:5432/crm?sslmode=verify-full";
		const verifyCaUrl =
			"postgresql://postgres:postgres@db.example.com:5432/crm?sslmode=verify-ca";

		expect(resolvePoolConfig(verifyFullUrl, true)).toBe(verifyFullUrl);
		expect(resolvePoolConfig(verifyCaUrl, true)).toBe(verifyCaUrl);
	});
});
