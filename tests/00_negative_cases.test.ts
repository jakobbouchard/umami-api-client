import UmamiAPIClient from "../src/index";

const rethrow = (err: Error) => {
	throw err;
};
const invalidTarget = "example.com";
const user = "user";
const password = "password";
const returnClasses = false;

describe("negative cases ", () => {
	test("getWebsite to an invalid target must respond 404", async function () {
		// flaky with timeout to 1 sec

		const umami = new UmamiAPIClient(invalidTarget, user, password, returnClasses);
		try {
			await umami.getWebsite().catch(rethrow);
			fail("Expected exception");
		} catch (error) {
			expect(error.message).toContain("Request failed with status code 404");
		}
	});
});
