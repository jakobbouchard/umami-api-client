import UmamiAPIClient from "../src/index";

const rethrow = (err: any) => {throw err;}
const serverGoogle = 'www.google.fr';
const user = 'user';
const password = 'password';
const returnClasses = false;

describe('negative cases ', () => {
  test('getWebsite to an invalid target must respond 404', async function() {// flaky with timeout to 1 sec

    var umami = new UmamiAPIClient(serverGoogle, user, password, returnClasses);
    try {
      await umami.getWebsite().catch(rethrow);
      fail('expect exception');
    } catch (error) {
      expect(error.message).toContain('Request failed with status code 404');
    }

  });
});
