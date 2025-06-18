import { CloudStackAuth } from '../../../src/cloudstack/auth';

describe('CloudStackAuth', () => {
  let auth: CloudStackAuth;

  beforeEach(() => {
    auth = new CloudStackAuth('test-api-key', 'test-secret-key');
  });

  describe('signRequest', () => {
    it('should generate consistent signatures for the same parameters', () => {
      const params = {
        command: 'listVirtualMachines',
        account: 'testaccount',
        domainid: '1'
      };

      const signature1 = auth.signRequest(params);
      const signature2 = auth.signRequest(params);

      expect(signature1).toBe(signature2);
      expect(signature1).toBeTruthy();
    });

    it('should generate different signatures for different parameters', () => {
      const params1 = { command: 'listVirtualMachines' };
      const params2 = { command: 'listNetworks' };

      const signature1 = auth.signRequest(params1);
      const signature2 = auth.signRequest(params2);

      expect(signature1).not.toBe(signature2);
    });

    it('should handle boolean parameters correctly', () => {
      const params = {
        command: 'listVirtualMachines',
        isrecursive: true,
        listall: false
      };

      const signature = auth.signRequest(params);
      expect(signature).toBeTruthy();
    });

    it('should handle array parameters correctly', () => {
      const params = {
        command: 'listVirtualMachines',
        ids: ['vm1', 'vm2', 'vm3']
      };

      const signature = auth.signRequest(params);
      expect(signature).toBeTruthy();
    });

    it('should sort parameters case-insensitively', () => {
      const params1 = { Command: 'test', account: 'test' };
      const params2 = { account: 'test', Command: 'test' };

      const signature1 = auth.signRequest(params1);
      const signature2 = auth.signRequest(params2);

      expect(signature1).toBe(signature2);
    });
  });

  describe('buildAuthenticatedUrl', () => {
    it('should build complete authenticated URL', () => {
      const baseUrl = 'https://cloudstack.example.com/client/api';
      const params = { command: 'listVirtualMachines' };

      const url = auth.buildAuthenticatedUrl(baseUrl, params);

      expect(url).toContain(baseUrl);
      expect(url).toContain('apikey=test-api-key');
      expect(url).toContain('response=json');
      expect(url).toContain('command=listVirtualMachines');
      expect(url).toContain('signature=');
    });

    it('should preserve additional parameters', () => {
      const baseUrl = 'https://cloudstack.example.com/client/api';
      const params = {
        command: 'listVirtualMachines',
        account: 'testaccount',
        zoneid: 'zone1'
      };

      const url = auth.buildAuthenticatedUrl(baseUrl, params);

      expect(url).toContain('account=testaccount');
      expect(url).toContain('zoneid=zone1');
    });
  });

  describe('validateCredentials', () => {
    it('should return true for valid credentials', () => {
      expect(auth.validateCredentials()).toBe(true);
    });

    it('should return false for empty API key', () => {
      const invalidAuth = new CloudStackAuth('', 'test-secret');
      expect(invalidAuth.validateCredentials()).toBe(false);
    });

    it('should return false for empty secret key', () => {
      const invalidAuth = new CloudStackAuth('test-api', '');
      expect(invalidAuth.validateCredentials()).toBe(false);
    });
  });

  describe('maskApiKey', () => {
    it('should mask API key properly', () => {
      const masked = auth.maskApiKey();
      expect(masked).toBe('test****-key');
      expect(masked).not.toContain('test-api-key');
    });

    it('should handle short API keys', () => {
      const shortAuth = new CloudStackAuth('short', 'secret');
      const masked = shortAuth.maskApiKey();
      expect(masked).toBe('INVALID');
    });
  });
});