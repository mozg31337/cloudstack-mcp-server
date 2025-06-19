import { CloudStackMCPServer } from '../../src/server';
import { CloudStackClient } from '../../src/cloudstack/client';
import { ConfigManager } from '../../src/utils/config';

// Mock dependencies
jest.mock('../../src/cloudstack/client');
jest.mock('../../src/utils/config');
jest.mock('../../src/utils/logger', () => ({
  Logger: {
    getInstance: jest.fn().mockReturnValue({
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

const MockedCloudStackClient = CloudStackClient as jest.MockedClass<typeof CloudStackClient>;
const MockedConfigManager = ConfigManager as jest.MockedClass<typeof ConfigManager>;

describe('CloudStack MCP Server - Firewall and Load Balancer Integration', () => {
  let server: any;
  let mockClient: jest.Mocked<CloudStackClient>;
  let mockConfigManager: jest.Mocked<ConfigManager>;

  beforeEach(() => {
    // Mock ConfigManager
    mockConfigManager = {
      getDefaultEnvironment: jest.fn().mockReturnValue({
        name: 'Test Environment',
        apiUrl: 'https://test.example.com/client/api',
        apiKey: 'test-api-key',
        secretKey: 'test-secret-key',
        timeout: 30000
      }),
      getLoggingConfig: jest.fn().mockReturnValue({
        level: 'info',
        file: 'logs/test.log'
      })
    } as any;

    MockedConfigManager.mockImplementation(() => mockConfigManager);

    // Mock CloudStackClient
    mockClient = {
      testConnection: jest.fn().mockResolvedValue(true),
      listSecurityGroups: jest.fn(),
      authorizeSecurityGroupIngress: jest.fn(),
      authorizeSecurityGroupEgress: jest.fn(),
      revokeSecurityGroupIngress: jest.fn(),
      revokeSecurityGroupEgress: jest.fn(),
      createLoadBalancerRule: jest.fn(),
      deleteLoadBalancerRule: jest.fn(),
      listLoadBalancerRules: jest.fn(),
      assignToLoadBalancerRule: jest.fn(),
      removeFromLoadBalancerRule: jest.fn(),
      updateLoadBalancerRule: jest.fn(),
      createLBHealthCheckPolicy: jest.fn(),
      deleteLBHealthCheckPolicy: jest.fn(),
      listLBHealthCheckPolicies: jest.fn(),
      createLBStickinessPolicy: jest.fn(),
      deleteLBStickinessPolicy: jest.fn(),
      listLBStickinessPolicies: jest.fn(),
      uploadSslCert: jest.fn(),
      deleteSslCert: jest.fn(),
      listSslCerts: jest.fn(),
      assignCertToLoadBalancer: jest.fn(),
      removeCertFromLoadBalancer: jest.fn(),
      createFirewallRule: jest.fn(),
      deleteFirewallRule: jest.fn(),
      listFirewallRules: jest.fn(),
      updateFirewallRule: jest.fn(),
      createNetworkACL: jest.fn(),
      deleteNetworkACL: jest.fn(),
      listNetworkACLs: jest.fn(),
      createNetworkACLList: jest.fn(),
      deleteNetworkACLList: jest.fn(),
      listNetworkACLLists: jest.fn(),
      replaceNetworkACLList: jest.fn(),
      updatePortForwardingRule: jest.fn()
    } as any;

    MockedCloudStackClient.mockImplementation(() => mockClient);

    // Create server instance
    server = new (CloudStackMCPServer as any)();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Security Group Tools', () => {
    it('should handle authorize_security_group_ingress tool', async () => {
      const mockResponse = {
        jobid: 'job-123',
        rule: {
          ruleid: 'rule-456',
          protocol: 'tcp',
          startport: 22,
          endport: 22
        }
      };

      mockClient.authorizeSecurityGroupIngress.mockResolvedValue(mockResponse);

      const toolRequest = {
        name: 'authorize_security_group_ingress',
        arguments: {
          securitygroupid: 'sg-123',
          protocol: 'tcp',
          startport: 22,
          endport: 22,
          cidrlist: '0.0.0.0/0'
        }
      };

      const result = await server.handleToolCall(toolRequest);

      expect(mockClient.authorizeSecurityGroupIngress).toHaveBeenCalledWith({
        securitygroupid: 'sg-123',
        protocol: 'tcp',
        startport: 22,
        endport: 22,
        cidrlist: '0.0.0.0/0'
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Successfully authorized security group ingress rule')
          }
        ]
      });
    });

    it('should handle authorize_security_group_egress tool', async () => {
      const mockResponse = {
        jobid: 'job-124',
        rule: {
          ruleid: 'rule-457',
          protocol: 'tcp',
          startport: 80,
          endport: 80
        }
      };

      mockClient.authorizeSecurityGroupEgress.mockResolvedValue(mockResponse);

      const toolRequest = {
        name: 'authorize_security_group_egress',
        arguments: {
          securitygroupid: 'sg-123',
          protocol: 'tcp',
          startport: 80,
          endport: 80,
          cidrlist: '0.0.0.0/0'
        }
      };

      const result = await server.handleToolCall(toolRequest);

      expect(mockClient.authorizeSecurityGroupEgress).toHaveBeenCalledWith({
        securitygroupid: 'sg-123',
        protocol: 'tcp',
        startport: 80,
        endport: 80,
        cidrlist: '0.0.0.0/0'
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Successfully authorized security group egress rule')
          }
        ]
      });
    });
  });

  describe('Load Balancer Tools', () => {
    it('should handle create_load_balancer_rule tool', async () => {
      const mockResponse = {
        jobid: 'job-200',
        loadbalancer: {
          id: 'lb-123',
          name: 'test-lb',
          algorithm: 'roundrobin',
          publicip: '192.168.1.100',
          publicport: 80,
          privateport: 8080
        }
      };

      mockClient.createLoadBalancerRule.mockResolvedValue(mockResponse);

      const toolRequest = {
        name: 'create_load_balancer_rule',
        arguments: {
          publicipid: 'ip-123',
          algorithm: 'roundrobin',
          name: 'test-lb',
          privateport: 8080,
          publicport: 80
        }
      };

      const result = await server.handleToolCall(toolRequest);

      expect(mockClient.createLoadBalancerRule).toHaveBeenCalledWith({
        publicipid: 'ip-123',
        algorithm: 'roundrobin',
        name: 'test-lb',
        privateport: 8080,
        publicport: 80
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Successfully created load balancer rule')
          }
        ]
      });
    });

    it('should handle assign_to_load_balancer_rule tool', async () => {
      const mockResponse = {
        jobid: 'job-202',
        success: true
      };

      mockClient.assignToLoadBalancerRule.mockResolvedValue(mockResponse);

      const toolRequest = {
        name: 'assign_to_load_balancer_rule',
        arguments: {
          id: 'lb-123',
          virtualmachineids: 'vm-1,vm-2'
        }
      };

      const result = await server.handleToolCall(toolRequest);

      expect(mockClient.assignToLoadBalancerRule).toHaveBeenCalledWith({
        id: 'lb-123',
        virtualmachineids: 'vm-1,vm-2'
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Successfully assigned VMs to load balancer rule')
          }
        ]
      });
    });
  });

  describe('SSL Certificate Tools', () => {
    it('should handle upload_ssl_cert tool', async () => {
      const mockResponse = {
        sslcert: {
          id: 'cert-123',
          name: 'test-cert',
          certificate: '-----BEGIN CERTIFICATE-----...',
          fingerprint: 'AA:BB:CC:DD:EE:FF'
        }
      };

      mockClient.uploadSslCert.mockResolvedValue(mockResponse);

      const toolRequest = {
        name: 'upload_ssl_cert',
        arguments: {
          name: 'test-cert',
          certificate: '-----BEGIN CERTIFICATE-----...',
          privatekey: '-----BEGIN PRIVATE KEY-----...'
        }
      };

      const result = await server.handleToolCall(toolRequest);

      expect(mockClient.uploadSslCert).toHaveBeenCalledWith({
        name: 'test-cert',
        certificate: '-----BEGIN CERTIFICATE-----...',
        privatekey: '-----BEGIN PRIVATE KEY-----...'
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Successfully uploaded SSL certificate')
          }
        ]
      });
    });
  });

  describe('Firewall Tools', () => {
    it('should handle create_firewall_rule tool', async () => {
      const mockResponse = {
        jobid: 'job-500',
        firewallrule: {
          id: 'fw-123',
          protocol: 'tcp',
          startport: 22,
          endport: 22,
          cidrlist: '10.0.0.0/8'
        }
      };

      mockClient.createFirewallRule.mockResolvedValue(mockResponse);

      const toolRequest = {
        name: 'create_firewall_rule',
        arguments: {
          ipaddressid: 'ip-123',
          protocol: 'tcp',
          startport: 22,
          endport: 22,
          cidrlist: '10.0.0.0/8'
        }
      };

      const result = await server.handleToolCall(toolRequest);

      expect(mockClient.createFirewallRule).toHaveBeenCalledWith({
        ipaddressid: 'ip-123',
        protocol: 'tcp',
        startport: 22,
        endport: 22,
        cidrlist: '10.0.0.0/8'
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Successfully created firewall rule')
          }
        ]
      });
    });
  });

  describe('Network ACL Tools', () => {
    it('should handle create_network_acl tool', async () => {
      const mockResponse = {
        jobid: 'job-600',
        networkaclrule: {
          id: 'acl-123',
          protocol: 'tcp',
          startport: 80,
          endport: 80,
          cidrlist: '0.0.0.0/0',
          action: 'allow'
        }
      };

      mockClient.createNetworkACL.mockResolvedValue(mockResponse);

      const toolRequest = {
        name: 'create_network_acl',
        arguments: {
          aclid: 'acllist-123',
          protocol: 'tcp',
          startport: 80,
          endport: 80,
          cidrlist: '0.0.0.0/0',
          action: 'allow'
        }
      };

      const result = await server.handleToolCall(toolRequest);

      expect(mockClient.createNetworkACL).toHaveBeenCalledWith({
        aclid: 'acllist-123',
        protocol: 'tcp',
        startport: 80,
        endport: 80,
        cidrlist: '0.0.0.0/0',
        action: 'allow'
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Successfully created network ACL rule')
          }
        ]
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle CloudStack API errors gracefully', async () => {
      const error = new Error('CloudStack API Error (401): Invalid credentials');
      mockClient.createLoadBalancerRule.mockRejectedValue(error);

      const toolRequest = {
        name: 'create_load_balancer_rule',
        arguments: {
          publicipid: 'ip-123',
          algorithm: 'roundrobin',
          name: 'test-lb',
          privateport: 8080,
          publicport: 80
        }
      };

      const result = await server.handleToolCall(toolRequest);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Error creating load balancer rule')
          }
        ],
        isError: true
      });
    });

    it('should handle network timeouts gracefully', async () => {
      const error = new Error('Request timeout after 30000ms');
      mockClient.listLoadBalancerRules.mockRejectedValue(error);

      const toolRequest = {
        name: 'list_load_balancer_rules',
        arguments: {}
      };

      const result = await server.handleToolCall(toolRequest);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Error listing load balancer rules')
          }
        ],
        isError: true
      });
    });

    it('should validate required parameters', async () => {
      const toolRequest = {
        name: 'create_load_balancer_rule',
        arguments: {
          // Missing required parameters
          algorithm: 'roundrobin',
          name: 'test-lb'
        }
      };

      const result = await server.handleToolCall(toolRequest);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Missing required parameters')
          }
        ],
        isError: true
      });
    });
  });

  describe('Response Formatting', () => {
    it('should format load balancer list responses properly', async () => {
      const mockResponse = {
        count: 2,
        loadbalancerrule: [
          {
            id: 'lb-123',
            name: 'test-lb-1',
            algorithm: 'roundrobin',
            publicip: '192.168.1.100',
            publicport: 80,
            privateport: 8080,
            state: 'Active'
          },
          {
            id: 'lb-124',
            name: 'test-lb-2',
            algorithm: 'leastconn',
            publicip: '192.168.1.101',
            publicport: 443,
            privateport: 8443,
            state: 'Active'
          }
        ]
      };

      mockClient.listLoadBalancerRules.mockResolvedValue(mockResponse);

      const toolRequest = {
        name: 'list_load_balancer_rules',
        arguments: {}
      };

      const result = await server.handleToolCall(toolRequest);

      expect(result.content[0].text).toContain('Found 2 load balancer rules');
      expect(result.content[0].text).toContain('test-lb-1');
      expect(result.content[0].text).toContain('test-lb-2');
      expect(result.content[0].text).toContain('roundrobin');
      expect(result.content[0].text).toContain('leastconn');
    });

    it('should format empty responses properly', async () => {
      const mockResponse = {
        count: 0,
        loadbalancerrule: []
      };

      mockClient.listLoadBalancerRules.mockResolvedValue(mockResponse);

      const toolRequest = {
        name: 'list_load_balancer_rules',
        arguments: {}
      };

      const result = await server.handleToolCall(toolRequest);

      expect(result.content[0].text).toContain('No load balancer rules found');
    });
  });
});