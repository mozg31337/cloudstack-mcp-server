import { CloudStackClient } from '../../../src/cloudstack/client';
import { CloudStackEnvironment } from '../../../src/cloudstack/types';

describe('CloudStack Network Management', () => {
  let client: CloudStackClient;

  const testEnvironment: CloudStackEnvironment = {
    name: 'Test Environment',
    apiUrl: 'https://test.example.com/client/api',
    apiKey: 'test-api-key',
    secretKey: 'test-secret-key',
    timeout: 30000,
    retries: 3
  };

  beforeEach(() => {
    client = new CloudStackClient(testEnvironment);
  });

  describe('Network Management', () => {
    it('should create network', async () => {
      const mockResponse = {
        data: {
          createnetworkresponse: {
            jobid: 'job-create-network-123',
            network: {
              id: 'network-456',
              name: 'test-network',
              state: 'Allocated'
            }
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        name: 'test-network',
        networkofferingid: 'offering-123',
        zoneid: 'zone-456'
      };

      const result = await client.createNetwork(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=createNetwork'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('name=test-network'));
      expect(result).toEqual(mockResponse.data.createnetworkresponse);
    });

    it('should delete network', async () => {
      const mockResponse = {
        data: {
          deletenetworkresponse: {
            jobid: 'job-delete-network-123'
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        id: 'network-456'
      };

      const result = await client.deleteNetwork(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=deleteNetwork'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('id=network-456'));
      expect(result).toEqual(mockResponse.data.deletenetworkresponse);
    });

    it('should update network', async () => {
      const mockResponse = {
        data: {
          updatenetworkresponse: {
            jobid: 'job-update-network-123',
            network: {
              id: 'network-456',
              name: 'updated-network'
            }
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        id: 'network-456',
        name: 'updated-network'
      };

      const result = await client.updateNetwork(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=updateNetwork'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('name=updated-network'));
      expect(result).toEqual(mockResponse.data.updatenetworkresponse);
    });

    it('should restart network', async () => {
      const mockResponse = {
        data: {
          restartnetworkresponse: {
            jobid: 'job-restart-network-123'
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        id: 'network-456'
      };

      const result = await client.restartNetwork(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=restartNetwork'));
      expect(result).toEqual(mockResponse.data.restartnetworkresponse);
    });
  });

  describe('IP Address Management', () => {
    it('should associate IP address', async () => {
      const mockResponse = {
        data: {
          associateipaddressresponse: {
            jobid: 'job-associate-ip-123',
            ipaddress: {
              id: 'ip-789',
              ipaddress: '203.0.113.10',
              state: 'Allocated'
            }
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        zoneid: 'zone-456',
        networkid: 'network-123'
      };

      const result = await client.associateIpAddress(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=associateIpAddress'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('networkid=network-123'));
      expect(result).toEqual(mockResponse.data.associateipaddressresponse);
    });

    it('should disassociate IP address', async () => {
      const mockResponse = {
        data: {
          disassociateipaddressresponse: {
            jobid: 'job-disassociate-ip-123'
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        id: 'ip-789'
      };

      const result = await client.disassociateIpAddress(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=disassociateIpAddress'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('id=ip-789'));
      expect(result).toEqual(mockResponse.data.disassociateipaddressresponse);
    });

    it('should list public IP addresses', async () => {
      const mockResponse = {
        data: {
          listpublicipaddressesresponse: {
            publicipaddress: [
              {
                id: 'ip-789',
                ipaddress: '203.0.113.10',
                state: 'Allocated',
                networkid: 'network-123'
              }
            ]
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        zoneid: 'zone-456'
      };

      const result = await client.listPublicIpAddresses(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=listPublicIpAddresses'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('zoneid=zone-456'));
      expect(result).toEqual(mockResponse.data.listpublicipaddressesresponse);
    });

    it('should update IP address', async () => {
      const mockResponse = {
        data: {
          updateipaddressresponse: {
            jobid: 'job-update-ip-123',
            ipaddress: {
              id: 'ip-789',
              ipaddress: '203.0.113.10'
            }
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        id: 'ip-789',
        customid: 'custom-ip-001'
      };

      const result = await client.updateIpAddress(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=updateIpAddress'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('customid=custom-ip-001'));
      expect(result).toEqual(mockResponse.data.updateipaddressresponse);
    });
  });

  describe('Static NAT Management', () => {
    it('should enable static NAT', async () => {
      const mockResponse = {
        data: {
          enablestaticnatresponse: {
            success: true
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        ipaddressid: 'ip-789',
        virtualmachineid: 'vm-123'
      };

      const result = await client.enableStaticNat(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=enableStaticNat'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('virtualmachineid=vm-123'));
      expect(result).toEqual(mockResponse.data.enablestaticnatresponse);
    });

    it('should disable static NAT', async () => {
      const mockResponse = {
        data: {
          disablestaticnatresponse: {
            jobid: 'job-disable-nat-123'
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        ipaddressid: 'ip-789'
      };

      const result = await client.disableStaticNat(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=disableStaticNat'));
      expect(result).toEqual(mockResponse.data.disablestaticnatresponse);
    });
  });

  describe('Port Forwarding Management', () => {
    it('should create port forwarding rule', async () => {
      const mockResponse = {
        data: {
          createportforwardingruleresponse: {
            jobid: 'job-create-pf-123',
            portforwardingrule: {
              id: 'pf-456',
              publicport: '80',
              privateport: '8080',
              protocol: 'TCP'
            }
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        ipaddressid: 'ip-789',
        publicport: '80',
        privateport: '8080',
        protocol: 'TCP',
        virtualmachineid: 'vm-123'
      };

      const result = await client.createPortForwardingRule(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=createPortForwardingRule'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('publicport=80'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('protocol=TCP'));
      expect(result).toEqual(mockResponse.data.createportforwardingruleresponse);
    });

    it('should delete port forwarding rule', async () => {
      const mockResponse = {
        data: {
          deleteportforwardingruleresponse: {
            jobid: 'job-delete-pf-123'
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        id: 'pf-456'
      };

      const result = await client.deletePortForwardingRule(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=deletePortForwardingRule'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('id=pf-456'));
      expect(result).toEqual(mockResponse.data.deleteportforwardingruleresponse);
    });

    it('should list port forwarding rules', async () => {
      const mockResponse = {
        data: {
          listportforwardingrulesresponse: {
            portforwardingrule: [
              {
                id: 'pf-456',
                publicport: '80',
                privateport: '8080',
                protocol: 'TCP',
                state: 'Active'
              }
            ]
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        ipaddressid: 'ip-789'
      };

      const result = await client.listPortForwardingRules(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=listPortForwardingRules'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('ipaddressid=ip-789'));
      expect(result).toEqual(mockResponse.data.listportforwardingrulesresponse);
    });

    it('should update port forwarding rule', async () => {
      const mockResponse = {
        data: {
          updateportforwardingruleresponse: {
            jobid: 'job-update-pf-123',
            portforwardingrule: {
              id: 'pf-456',
              publicport: '80',
              privateport: '8080'
            }
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        id: 'pf-456',
        customid: 'web-server-pf'
      };

      const result = await client.updatePortForwardingRule(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=updatePortForwardingRule'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('customid=web-server-pf'));
      expect(result).toEqual(mockResponse.data.updateportforwardingruleresponse);
    });
  });

  describe('Network Offerings Management', () => {
    it('should list network offerings', async () => {
      const mockResponse = {
        data: {
          listnetworkofferingsresponse: {
            networkoffering: [
              {
                id: 'offering-123',
                name: 'DefaultIsolatedNetworkOfferingWithSourceNat',
                displaytext: 'Offering for Isolated networks with Source Nat service enabled',
                traffictype: 'GUEST',
                isdefault: true,
                state: 'Enabled'
              }
            ]
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        traffictype: 'GUEST'
      };

      const result = await client.listNetworkOfferings(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=listNetworkOfferings'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('traffictype=GUEST'));
      expect(result).toEqual(mockResponse.data.listnetworkofferingsresponse);
    });
  });

  describe('IP Forwarding Rules', () => {
    it('should create IP forwarding rule', async () => {
      const mockResponse = {
        data: {
          createipforwardingruleresponse: {
            jobid: 'job-create-ipfwd-123',
            ipforwardingrule: {
              id: 'ipfwd-456',
              startport: 22,
              endport: 22,
              protocol: 'TCP'
            }
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        ipaddressid: 'ip-789',
        startport: 22,
        endport: 22,
        protocol: 'TCP'
      };

      const result = await client.createIpForwardingRule(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=createIpForwardingRule'));
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('startport=22'));
      expect(result).toEqual(mockResponse.data.createipforwardingruleresponse);
    });

    it('should delete IP forwarding rule', async () => {
      const mockResponse = {
        data: {
          deleteipforwardingruleresponse: {
            jobid: 'job-delete-ipfwd-123'
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        id: 'ipfwd-456'
      };

      const result = await client.deleteIpForwardingRule(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=deleteIpForwardingRule'));
      expect(result).toEqual(mockResponse.data.deleteipforwardingruleresponse);
    });

    it('should list IP forwarding rules', async () => {
      const mockResponse = {
        data: {
          listipforwardingrulesresponse: {
            ipforwardingrule: [
              {
                id: 'ipfwd-456',
                startport: 22,
                endport: 22,
                protocol: 'TCP',
                state: 'Active'
              }
            ]
          }
        }
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      (client as any).httpClient.get = mockGet;

      const params = {
        ipaddressid: 'ip-789'
      };

      const result = await client.listIpForwardingRules(params);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('command=listIpForwardingRules'));
      expect(result).toEqual(mockResponse.data.listipforwardingrulesresponse);
    });
  });
});