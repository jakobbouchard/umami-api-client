import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import UmamiAPIClient from "../src/index";

const AUTH_RESPONSE = {
	token: "thisIsTokenPlaceHolder",
	user: { user_id: 1, username: "admin", is_admin: true },
};
const GET_WEBSITES = [
	{
		id: 3,
		websiteUuid: "222aefa6-6a04-41e7-b3f6-1dc1202850da",
		userId: 1,
		name: "a__www.example.fr",
		domain: "www.example.fr",
		createdAt: "2022-02-17T12:57:43.805Z",
	},
	{
		id: 2,
		websiteUuid: "2220837f-6d57-4ec7-8941-1541624e65c7",
		userId: 1,
		name: "b__integration",
		domain: "integration.example.fr",
		createdAt: "2022-02-16T20:33:31.106Z",
	},
	{
		id: 1,
		websiteUuid: "2224c9d5-12ad-41db-923a-961d6f695430",
		userId: 1,
		name: "dev",
		domain: "localhost",
		createdAt: "2022-02-16T12:44:44.015Z",
	},
];

const server = "umami.example.fr";
const user = "admin";
const password = "012345678";
const returnClasses = false;

describe("getters", () => {
	let mock: MockAdapter;

	beforeAll(() => {
		mock = new MockAdapter(axios);
	});

	afterEach(() => {
		mock.reset();
	});

	const mockAuthRequest = () =>
		mock.onPost(`https://${server}/api/auth/login`).reply(200, AUTH_RESPONSE);
	const mockGetWebsites = () =>
		mock.onGet(`https://${server}/api/websites`).reply(200, GET_WEBSITES);

	describe("getWebsites", () => {
		it("getWebsites should return all websites", async () => {
			// GIVEN
			mockAuthRequest();
			mockGetWebsites();

			const umami = new UmamiAPIClient(server, user, password, returnClasses);

			const catchFn = vi.fn();
			const thenFn = vi.fn();

			// WHEN
			await umami.getWebsites().then(thenFn).catch(catchFn);

			// THEN
			expect(thenFn).toHaveBeenCalledWith(GET_WEBSITES);
			expect(catchFn).not.toHaveBeenCalled();
		});

		it("getWebsite should return first website", async () => {
			// GIVEN
			mockAuthRequest();
			mockGetWebsites();

			const umami = new UmamiAPIClient(server, user, password, returnClasses);

			const catchFn = vi.fn();
			const thenFn = vi.fn();

			// WHEN
			await umami.getWebsite().then(thenFn).catch(catchFn);

			// THEN
			expect(thenFn).toHaveBeenCalledWith(GET_WEBSITES[0]);
			expect(catchFn).not.toHaveBeenCalled();
		});
	});
});
