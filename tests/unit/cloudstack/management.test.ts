import { CloudStackClient } from '../../../src/cloudstack/client';
import { CloudStackEnvironment } from '../../../src/cloudstack/types';

jest.mock('axios');

describe('CloudStack Management Operations', () => {
  let client: CloudStackClient;
  let mockEnvironment: CloudStackEnvironment;

  beforeEach(() => {
    mockEnvironment = {
      name: 'Test Environment',
      apiUrl: 'https://test.example.com/client/api',
      apiKey: 'test-api-key',
      secretKey: 'test-secret-key',
      timeout: 30000,
      retries: 3
    };

    const mockAxiosInstance = {
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };

    require('axios').create.mockReturnValue(mockAxiosInstance);
    client = new CloudStackClient(mockEnvironment);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Virtual Machine Management', () => {
    it('should deploy virtual machine with correct parameters', async () => {
      const mockResponse = {
        data: {
          deployvirtualmachineresponse: {
            jobid: 'job-12345',
            virtualmachine: {
              id: 'vm-67890',
              name: 'test-vm',
              state: 'Starting'
            }
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        serviceofferingid: 'offering-123',
        templateid: 'template-456',
        zoneid: 'zone-789',
        name: 'test-vm'
      };

      const result = await client.deployVirtualMachine(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=deployVirtualMachine'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('serviceofferingid=offering-123'));
      expect(result).toEqual(mockResponse.data.deployvirtualmachineresponse);
    });

    it('should start virtual machine', async () => {
      const mockResponse = {
        data: {
          startvirtualmachineresponse: {
            jobid: 'job-12345'
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const result = await client.startVirtualMachine({ id: 'vm-123' });

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=startVirtualMachine'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('id=vm-123'));
      expect(result).toEqual(mockResponse.data.startvirtualmachineresponse);
    });

    it('should stop virtual machine with force option', async () => {
      const mockResponse = {
        data: {
          stopvirtualmachineresponse: {
            jobid: 'job-12345'
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const result = await client.stopVirtualMachine({ id: 'vm-123', forced: true });

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=stopVirtualMachine'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('forced=true'));
      expect(result).toEqual(mockResponse.data.stopvirtualmachineresponse);
    });

    it('should destroy virtual machine', async () => {
      const mockResponse = {
        data: {
          destroyvirtualmachineresponse: {
            jobid: 'job-12345'
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const result = await client.destroyVirtualMachine({ id: 'vm-123' });

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=destroyVirtualMachine'));
      expect(result).toEqual(mockResponse.data.destroyvirtualmachineresponse);
    });

    it('should update virtual machine properties', async () => {
      const mockResponse = {
        data: {
          updatevirtualmachineresponse: {
            virtualmachine: {
              id: 'vm-123',
              name: 'test-vm',
              displayname: 'Updated VM',
              state: 'Running'
            }
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        id: 'vm-123',
        displayname: 'Updated VM',
        haenable: true
      };

      const result = await client.updateVirtualMachine(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=updateVirtualMachine'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('displayname=Updated%20VM'));
      expect(result).toEqual(mockResponse.data.updatevirtualmachineresponse);
    });
  });

  describe('Volume Management', () => {
    it('should create volume with correct parameters', async () => {
      const mockResponse = {
        data: {
          createvolumeresponse: {
            jobid: 'job-12345',
            volume: {
              id: 'vol-67890',
              name: 'test-volume',
              state: 'Allocated'
            }
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        name: 'test-volume',
        diskofferingid: 'offering-123',
        zoneid: 'zone-456',
        size: 100
      };

      const result = await client.createVolume(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=createVolume'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('size=100'));
      expect(result).toEqual(mockResponse.data.createvolumeresponse);
    });

    it('should attach volume to virtual machine', async () => {
      const mockResponse = {
        data: {
          attachvolumeresponse: {
            jobid: 'job-12345'
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        id: 'vol-123',
        virtualmachineid: 'vm-456',
        deviceid: 1
      };

      const result = await client.attachVolume(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=attachVolume'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('virtualmachineid=vm-456'));
      expect(result).toEqual(mockResponse.data.attachvolumeresponse);
    });

    it('should detach volume from virtual machine', async () => {
      const mockResponse = {
        data: {
          detachvolumeresponse: {
            jobid: 'job-12345'
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const result = await client.detachVolume({ id: 'vol-123' });

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=detachVolume'));
      expect(result).toEqual(mockResponse.data.detachvolumeresponse);
    });

    it('should resize volume', async () => {
      const mockResponse = {
        data: {
          resizevolumeresponse: {
            jobid: 'job-12345'
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        id: 'vol-123',
        size: 200,
        shrinkok: false
      };

      const result = await client.resizeVolume(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=resizeVolume'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('size=200'));
      expect(result).toEqual(mockResponse.data.resizevolumeresponse);
    });
  });

  describe('Snapshot Management', () => {
    it('should create snapshot with correct parameters', async () => {
      const mockResponse = {
        data: {
          createsnapshotresponse: {
            jobid: 'job-12345',
            snapshot: {
              id: 'snap-67890',
              name: 'test-snapshot',
              state: 'CreatedOnPrimary'
            }
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        volumeid: 'vol-123',
        name: 'test-snapshot'
      };

      const result = await client.createSnapshot(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=createSnapshot'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('volumeid=vol-123'));
      expect(result).toEqual(mockResponse.data.createsnapshotresponse);
    });

    it('should delete snapshot', async () => {
      const mockResponse = {
        data: {
          deletesnapshotresponse: {
            jobid: 'job-12345'
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const result = await client.deleteSnapshot({ id: 'snap-123' });

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=deleteSnapshot'));
      expect(result).toEqual(mockResponse.data.deletesnapshotresponse);
    });

    it('should create volume from snapshot', async () => {
      const mockResponse = {
        data: {
          createvolumefromsnapshotresponse: {
            jobid: 'job-12345',
            volume: {
              id: 'vol-67890',
              name: 'restored-volume'
            }
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        snapshotid: 'snap-123',
        name: 'restored-volume'
      };

      const result = await client.createVolumeFromSnapshot(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=createVolumeFromSnapshot'));
      expect(result).toEqual(mockResponse.data.createvolumefromsnapshotresponse);
    });
  });

  describe('Security Group Management', () => {
    it('should create security group', async () => {
      const mockResponse = {
        data: {
          createsecuritygroupresponse: {
            securitygroup: {
              id: 'sg-12345',
              name: 'test-sg',
              description: 'Test security group'
            }
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        name: 'test-sg',
        description: 'Test security group'
      };

      const result = await client.createSecurityGroup(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=createSecurityGroup'));
      expect(result).toEqual(mockResponse.data.createsecuritygroupresponse);
    });

    it('should authorize security group ingress rule', async () => {
      const mockResponse = {
        data: {
          authorizesecuritygroupingressresponse: {
            jobid: 'job-12345'
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        securitygroupid: 'sg-123',
        protocol: 'TCP',
        startport: 80,
        endport: 80,
        cidrlist: '0.0.0.0/0'
      };

      const result = await client.authorizeSecurityGroupIngress(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=authorizeSecurityGroupIngress'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('protocol=TCP'));
      expect(result).toEqual(mockResponse.data.authorizesecuritygroupingressresponse);
    });

    it('should revoke security group ingress rule', async () => {
      const mockResponse = {
        data: {
          revokesecuritygroupingressresponse: {
            jobid: 'job-12345'
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const result = await client.revokeSecurityGroupIngress({ id: 'rule-123' });

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=revokeSecurityGroupIngress'));
      expect(result).toEqual(mockResponse.data.revokesecuritygroupingressresponse);
    });
  });

  describe('Error Handling', () => {
    it('should handle CloudStack API errors for management operations', async () => {
      const apiError = new Error('CloudStack API Error (432): Insufficient capacity');
      const mockGet = jest.fn().mockRejectedValue(apiError);
      (client as any).httpClient.get = mockGet;

      await expect(client.deployVirtualMachine({
        serviceofferingid: 'offering-123',
        templateid: 'template-456',
        zoneid: 'zone-789'
      })).rejects.toThrow('CloudStack API Error (432): Insufficient capacity');
    });

    it('should handle network timeouts for long-running operations', async () => {
      const timeoutError = new Error('Request timeout after 30000ms');
      timeoutError.name = 'ECONNABORTED';
      const mockGet = jest.fn().mockRejectedValue(timeoutError);
      (client as any).httpClient.get = mockGet;

      await expect(client.createVolume({
        name: 'test-volume',
        diskofferingid: 'offering-123',
        zoneid: 'zone-456'
      })).rejects.toThrow('Request timeout');
    });
  });
});