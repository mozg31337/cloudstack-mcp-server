import { CloudStackClient } from '../../../src/cloudstack/client';
import { CloudStackEnvironment } from '../../../src/cloudstack/types';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CloudStackClient - Firewall and Load Balancer Management', () => {
  let client: CloudStackClient;
  let mockEnvironment: CloudStackEnvironment;
  let mockGet: jest.Mock;

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

    mockGet = mockAxiosInstance.get;
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    client = new CloudStackClient(mockEnvironment);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Security Group Management', () => {
    it('should authorize security group ingress rules', async () => {
      const mockResponse = {
        data: {
          authorizesecuritygroupingressresponse: {
            jobid: 'job-123',
            rule: {
              ruleid: 'rule-456',
              protocol: 'tcp',
              startport: 22,
              endport: 22
            }
          }
        }
      };

      mockGet.mockResolvedValue(mockResponse);

      const params = {
        securitygroupid: 'sg-123',
        protocol: 'tcp',
        startport: 22,
        endport: 22,
        cidrlist: '0.0.0.0/0'
      };

      const result = await client.authorizeSecurityGroupIngress(params);

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('command=authorizeSecurityGroupIngress')
      );
      expect(result).toEqual(mockResponse.data.authorizesecuritygroupingressresponse);
    });

    it('should authorize security group egress rules', async () => {
      const mockResponse = {
        data: {
          authorizesecuritygroupegressresponse: {
            jobid: 'job-124',
            rule: {
              ruleid: 'rule-457',
              protocol: 'tcp',
              startport: 80,
              endport: 80
            }
          }
        }
      };

      mockGet.mockResolvedValue(mockResponse);

      const params = {
        securitygroupid: 'sg-123',
        protocol: 'tcp',
        startport: 80,
        endport: 80,
        cidrlist: '0.0.0.0/0'
      };

      const result = await client.authorizeSecurityGroupEgress(params);

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('command=authorizeSecurityGroupEgress')
      );
      expect(result).toEqual(mockResponse.data.authorizesecuritygroupegressresponse);
    });

    it('should revoke security group ingress rules', async () => {
      const mockResponse = {
        data: {
          revokesecuritygroupingressresponse: {
            jobid: 'job-125',
            success: true
          }
        }
      };

      mockGet.mockResolvedValue(mockResponse);

      const params = { id: 'rule-456' };
      const result = await client.revokeSecurityGroupIngress(params);

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('command=revokeSecurityGroupIngress')
      );
      expect(result).toEqual(mockResponse.data.revokesecuritygroupingressresponse);
    });

    it('should revoke security group egress rules', async () => {
      const mockResponse = {
        data: {
          revokesecuritygroupegressresponse: {
            jobid: 'job-126',
            success: true
          }
        }
      };

      mockGet.mockResolvedValue(mockResponse);

      const params = { id: 'rule-457' };
      const result = await client.revokeSecurityGroupEgress(params);

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('command=revokeSecurityGroupEgress')
      );
      expect(result).toEqual(mockResponse.data.revokesecuritygroupegressresponse);
    });
  });

  describe('Load Balancer Management', () => {
    it('should create load balancer rule', async () => {
      const mockResponse = {
        data: {
          createloadbalancerruleresponse: {
            jobid: 'job-200',
            loadbalancer: {
              id: 'lb-123',
              name: 'test-lb',
              algorithm: 'roundrobin',
              publicip: '192.168.1.100',
              publicport: 80,
              privateport: 8080
            }
          }
        }
      };

      mockGet.mockResolvedValue(mockResponse);

      const params = {
        publicipid: 'ip-123',
        algorithm: 'roundrobin',
        name: 'test-lb',
        privateport: 8080,
        publicport: 80
      };

      const result = await client.createLoadBalancerRule(params);

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('command=createLoadBalancerRule')
      );
      expect(result).toEqual(mockResponse.data.createloadbalancerruleresponse);
    });

    it('should delete load balancer rule', async () => {
      const mockResponse = {
        data: {
          deleteloadbalancerruleresponse: {
            jobid: 'job-201',
            success: true
          }
        }
      };

      mockGet.mockResolvedValue(mockResponse);

      const params = { id: 'lb-123' };
      const result = await client.deleteLoadBalancerRule(params);

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('command=deleteLoadBalancerRule')
      );
      expect(result).toEqual(mockResponse.data.deleteloadbalancerruleresponse);
    });

    it('should assign VMs to load balancer rule', async () => {
      const mockResponse = {
        data: {
          assigntoloadbalancerruleresponse: {
            jobid: 'job-202',
            success: true
          }
        }
      };

      mockGet.mockResolvedValue(mockResponse);

      const params = {
        id: 'lb-123',
        virtualmachineids: 'vm-1,vm-2'
      };

      const result = await client.assignToLoadBalancerRule(params);

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('command=assignToLoadBalancerRule')
      );
      expect(result).toEqual(mockResponse.data.assigntoloadbalancerruleresponse);
    });

    it('should remove VMs from load balancer rule', async () => {
      const mockResponse = {
        data: {
          removefromloadbalancerruleresponse: {
            jobid: 'job-203',
            success: true
          }
        }
      };

      mockGet.mockResolvedValue(mockResponse);

      const params = {
        id: 'lb-123',
        virtualmachineids: 'vm-1'
      };

      const result = await client.removeFromLoadBalancerRule(params);

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('command=removeFromLoadBalancerRule')
      );
      expect(result).toEqual(mockResponse.data.removefromloadbalancerruleresponse);
    });

    it('should list load balancer rules', async () => {
      const mockResponse = {
        data: {
          listloadbalancerrulesresponse: {
            count: 2,
            loadbalancerrule: [
              {
                id: 'lb-123',
                name: 'test-lb-1',
                algorithm: 'roundrobin',
                publicip: '192.168.1.100',
                publicport: 80,
                privateport: 8080
              },
              {
                id: 'lb-124',
                name: 'test-lb-2',
                algorithm: 'leastconn',
                publicip: '192.168.1.101',
                publicport: 443,
                privateport: 8443
              }
            ]
          }
        }
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await client.listLoadBalancerRules();

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('command=listLoadBalancerRules')
      );
      expect(result).toEqual(mockResponse.data.listloadbalancerrulesresponse);
    });
  });

  describe('Load Balancer Health Check Policies', () => {
    it('should create LB health check policy', async () => {
      const mockResponse = {
        data: {
          createlbhealthcheckpolicyresponse: {
            jobid: 'job-300',
            healthcheckpolicy: {
              id: 'hcp-123',
              pingpath: '/health',
              intervaltime: 30,
              responsetime: 5,
              healthythreshold: 3,
              unhealthythreshold: 2
            }
          }
        }
      };

      mockGet.mockResolvedValue(mockResponse);

      const params = {
        lbruleid: 'lb-123',
        pingpath: '/health',
        intervaltime: 30,
        responsetime: 5,
        healthythreshold: 3,
        unhealthythreshold: 2
      };

      const result = await client.createLBHealthCheckPolicy(params);

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('command=createLBHealthCheckPolicy')
      );
      expect(result).toEqual(mockResponse.data.createlbhealthcheckpolicyresponse);
    });

    it('should delete LB health check policy', async () => {
      const mockResponse = {
        data: {
          deletelbhealthcheckpolicyresponse: {
            jobid: 'job-301',
            success: true
          }
        }
      };

      mockGet.mockResolvedValue(mockResponse);

      const params = { id: 'hcp-123' };
      const result = await client.deleteLBHealthCheckPolicy(params);

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('command=deleteLBHealthCheckPolicy')
      );
      expect(result).toEqual(mockResponse.data.deletelbhealthcheckpolicyresponse);
    });
  });

  describe('Load Balancer Stickiness Policies', () => {
    it('should create LB stickiness policy', async () => {
      const mockResponse = {
        data: {
          createlbstickinesspolicyresponse: {
            jobid: 'job-400',
            stickinesspolicy: {
              id: 'sp-123',
              name: 'session-stickiness',
              methodname: 'LbCookie',
              params: { holdtime: '3600' }
            }
          }
        }
      };

      mockGet.mockResolvedValue(mockResponse);

      const params = {
        lbruleid: 'lb-123',
        name: 'session-stickiness',
        methodname: 'LbCookie',
        param: JSON.stringify({ holdtime: '3600' })
      };

      const result = await client.createLBStickinessPolicy(params);

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('command=createLBStickinessPolicy')
      );
      expect(result).toEqual(mockResponse.data.createlbstickinesspolicyresponse);
    });

    it('should delete LB stickiness policy', async () => {
      const mockResponse = {
        data: {
          deletelbstickinesspolicyresponse: {
            jobid: 'job-401',
            success: true
          }
        }
      };

      mockGet.mockResolvedValue(mockResponse);

      const params = { id: 'sp-123' };
      const result = await client.deleteLBStickinessPolicy(params);

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('command=deleteLBStickinessPolicy')
      );
      expect(result).toEqual(mockResponse.data.deletelbstickinesspolicyresponse);
    });
  });

  describe('SSL Certificate Management', () => {
    it('should upload SSL certificate', async () => {
      const mockResponse = {
        data: {
          uploadsslcertresponse: {
            sslcert: {
              id: 'cert-123',
              name: 'test-cert',
              certificate: '-----BEGIN CERTIFICATE-----...',
              chain: '-----BEGIN CERTIFICATE-----...',
              fingerprint: 'AA:BB:CC:DD:EE:FF'
            }
          }
        }
      };

      mockGet.mockResolvedValue(mockResponse);

      const params = {
        name: 'test-cert',
        certificate: '-----BEGIN CERTIFICATE-----...',
        privatekey: '-----BEGIN PRIVATE KEY-----...',
        certchain: '-----BEGIN CERTIFICATE-----...'
      };

      const result = await client.uploadSslCert(params);

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('command=uploadSslCert')
      );
      expect(result).toEqual(mockResponse.data.uploadsslcertresponse);
    });

    it('should delete SSL certificate', async () => {
      const mockResponse = {
        data: {
          deletesslcertresponse: {
            success: true
          }
        }
      };

      mockGet.mockResolvedValue(mockResponse);

      const params = { id: 'cert-123' };
      const result = await client.deleteSslCert(params);

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('command=deleteSslCert')
      );
      expect(result).toEqual(mockResponse.data.deletesslcertresponse);
    });

    it('should list SSL certificates', async () => {
      const mockResponse = {
        data: {
          listsslcertsresponse: {
            count: 1,
            sslcert: [
              {
                id: 'cert-123',
                name: 'test-cert',
                fingerprint: 'AA:BB:CC:DD:EE:FF'
              }
            ]
          }
        }
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await client.listSslCerts();

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('command=listSslCerts')
      );
      expect(result).toEqual(mockResponse.data.listsslcertsresponse);
    });
  });

  describe('Firewall Rules Management', () => {
    it('should create firewall rule', async () => {
      const mockResponse = {
        data: {
          createfirewallruleresponse: {
            jobid: 'job-500',
            firewallrule: {
              id: 'fw-123',
              protocol: 'tcp',
              startport: 22,
              endport: 22,
              cidrlist: '10.0.0.0/8'
            }
          }
        }
      };

      mockGet.mockResolvedValue(mockResponse);

      const params = {
        ipaddressid: 'ip-123',
        protocol: 'tcp',
        startport: 22,
        endport: 22,
        cidrlist: '10.0.0.0/8'
      };

      const result = await client.createFirewallRule(params);

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('command=createFirewallRule')
      );
      expect(result).toEqual(mockResponse.data.createfirewallruleresponse);
    });

    it('should delete firewall rule', async () => {
      const mockResponse = {
        data: {
          deletefirewallruleresponse: {
            jobid: 'job-501',
            success: true
          }
        }
      };

      mockGet.mockResolvedValue(mockResponse);

      const params = { id: 'fw-123' };
      const result = await client.deleteFirewallRule(params);

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('command=deleteFirewallRule')
      );
      expect(result).toEqual(mockResponse.data.deletefirewallruleresponse);
    });

    it('should list firewall rules', async () => {
      const mockResponse = {
        data: {
          listfirewallrulesresponse: {
            count: 1,
            firewallrule: [
              {
                id: 'fw-123',
                protocol: 'tcp',
                startport: 22,
                endport: 22,
                cidrlist: '10.0.0.0/8',
                state: 'Active'
              }
            ]
          }
        }
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await client.listFirewallRules();

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('command=listFirewallRules')
      );
      expect(result).toEqual(mockResponse.data.listfirewallrulesresponse);
    });
  });

  describe('Network ACL Management', () => {
    it('should create network ACL rule', async () => {
      const mockResponse = {
        data: {
          createnetworkaclresponse: {
            jobid: 'job-600',
            networkaclrule: {
              id: 'acl-123',
              protocol: 'tcp',
              startport: 80,
              endport: 80,
              cidrlist: '0.0.0.0/0',
              action: 'allow'
            }
          }
        }
      };

      mockGet.mockResolvedValue(mockResponse);

      const params = {
        aclid: 'acllist-123',
        protocol: 'tcp',
        startport: 80,
        endport: 80,
        cidrlist: '0.0.0.0/0',
        action: 'allow'
      };

      const result = await client.createNetworkACL(params);

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('command=createNetworkACL')
      );
      expect(result).toEqual(mockResponse.data.createnetworkaclresponse);
    });

    it('should delete network ACL rule', async () => {
      const mockResponse = {
        data: {
          deletenetworkaclresponse: {
            jobid: 'job-601',
            success: true
          }
        }
      };

      mockGet.mockResolvedValue(mockResponse);

      const params = { id: 'acl-123' };
      const result = await client.deleteNetworkACL(params);

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('command=deleteNetworkACL')
      );
      expect(result).toEqual(mockResponse.data.deletenetworkaclresponse);
    });

    it('should list network ACL rules', async () => {
      const mockResponse = {
        data: {
          listnetworkaclsresponse: {
            count: 1,
            networkaclrule: [
              {
                id: 'acl-123',
                protocol: 'tcp',
                startport: 80,
                endport: 80,
                cidrlist: '0.0.0.0/0',
                action: 'allow',
                state: 'Active'
              }
            ]
          }
        }
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await client.listNetworkACLs();

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('command=listNetworkACLs')
      );
      expect(result).toEqual(mockResponse.data.listnetworkaclsresponse);
    });

    it('should create network ACL list', async () => {
      const mockResponse = {
        data: {
          createnetworkacllistresponse: {
            jobid: 'job-602',
            networkacllist: {
              id: 'acllist-124',
              name: 'test-acl-list',
              description: 'Test ACL list'
            }
          }
        }
      };

      mockGet.mockResolvedValue(mockResponse);

      const params = {
        name: 'test-acl-list',
        description: 'Test ACL list',
        vpcid: 'vpc-123'
      };

      const result = await client.createNetworkACLList(params);

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('command=createNetworkACLList')
      );
      expect(result).toEqual(mockResponse.data.createnetworkacllistresponse);
    });

    it('should delete network ACL list', async () => {
      const mockResponse = {
        data: {
          deletenetworkacllistresponse: {
            jobid: 'job-603',
            success: true
          }
        }
      };

      mockGet.mockResolvedValue(mockResponse);

      const params = { id: 'acllist-124' };
      const result = await client.deleteNetworkACLList(params);

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('command=deleteNetworkACLList')
      );
      expect(result).toEqual(mockResponse.data.deletenetworkacllistresponse);
    });
  });

  describe('Port Forwarding Management', () => {
    it('should update port forwarding rule', async () => {
      const mockResponse = {
        data: {
          updateportforwardingruleresponse: {
            jobid: 'job-700',
            portforwardingrule: {
              id: 'pf-123',
              publicport: 2222,
              privateport: 22,
              protocol: 'tcp'
            }
          }
        }
      };

      mockGet.mockResolvedValue(mockResponse);

      const params = {
        id: 'pf-123',
        publicport: 2222
      };

      const result = await client.updatePortForwardingRule(params);

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('command=updatePortForwardingRule')
      );
      expect(result).toEqual(mockResponse.data.updateportforwardingruleresponse);
    });
  });
});