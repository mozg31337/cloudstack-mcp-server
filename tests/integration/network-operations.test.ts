import { TestFramework } from '../helpers/TestFramework';

// Mock all dependencies
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

describe('Network Operations - Comprehensive Test Suite', () => {
  let testFramework: TestFramework;
  let server: any;

  beforeEach(async () => {
    testFramework = new TestFramework();
    
    // Import server after mocks are set up
    const { CloudStackMCPServer } = await import('../../src/server');
    server = new (CloudStackMCPServer as any)();
    
    // Replace the mocked dependencies
    (server as any).client = testFramework.mockClient;
    (server as any).configManager = testFramework.mockConfigManager;
  });

  afterEach(() => {
    testFramework.resetMocks();
  });

  describe('Basic Network Operations', () => {
    describe('create_network', () => {
      it('should create network successfully with required parameters', async () => {
        const mockResponse = testFramework.createAsyncJobResponse('create-network-job-123');
        testFramework.mockClient.createNetwork.mockResolvedValue(mockResponse);

        const params = {
          displaytext: 'Test Network',
          name: 'test-network',
          networkofferingid: 'net-offering-123',
          zoneid: 'zone-123'
        };

        const response = await (server as any).handleCreateNetwork(params);

        expect(testFramework.mockClient.createNetwork).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response, 'Network creation');
      });

      it('should create network with optional parameters', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createNetwork.mockResolvedValue(mockResponse);

        const params = {
          displaytext: 'Test Network',
          name: 'test-network',
          networkofferingid: 'net-offering-123',
          zoneid: 'zone-123',
          gateway: '192.168.1.1',
          netmask: '255.255.255.0',
          startip: '192.168.1.10',
          endip: '192.168.1.200',
          vlan: '100',
          account: 'test-account',
          domainid: 'domain-123'
        };

        const response = await (server as any).handleCreateNetwork(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when name is missing', async () => {
        const params = {
          displaytext: 'Test Network',
          networkofferingid: 'net-offering-123',
          zoneid: 'zone-123'
        };

        await testFramework.expectError(
          () => (server as any).handleCreateNetwork(params),
          'Missing required parameter: name'
        );
      });

      it('should fail when network offering ID is missing', async () => {
        const params = {
          displaytext: 'Test Network',
          name: 'test-network',
          zoneid: 'zone-123'
        };

        await testFramework.expectError(
          () => (server as any).handleCreateNetwork(params),
          'Missing required parameter: networkofferingid'
        );
      });
    });

    describe('list_networks', () => {
      it('should list networks successfully', async () => {
        const response = await (server as any).handleListNetworks({});

        expect(testFramework.mockClient.listNetworks).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list networks with filtering parameters', async () => {
        const params = {
          type: 'Isolated',
          zoneid: 'zone-123',
          account: 'test-account',
          keyword: 'web-tier',
          state: 'Allocated'
        };

        const response = await (server as any).handleListNetworks(params);

        expect(testFramework.mockClient.listNetworks).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('update_network', () => {
      it('should update network successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.updateNetwork.mockResolvedValue(mockResponse);

        const params = {
          id: 'net-123',
          name: 'updated-network-name',
          displaytext: 'Updated network description'
        };

        const response = await (server as any).handleUpdateNetwork(params);

        expect(testFramework.mockClient.updateNetwork).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Network update');
      });

      it('should fail when network ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleUpdateNetwork({ name: 'updated-name' }),
          'Network ID is required'
        );
      });
    });

    describe('delete_network', () => {
      it('should delete network successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.deleteNetwork.mockResolvedValue(mockResponse);

        const params = { id: 'net-123' };
        const response = await (server as any).handleDeleteNetwork(params);

        expect(testFramework.mockClient.deleteNetwork).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Network deletion');
      });

      it('should fail when network ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleDeleteNetwork({}),
          'Network ID is required'
        );
      });
    });

    describe('restart_network', () => {
      it('should restart network successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.restartNetwork.mockResolvedValue(mockResponse);

        const params = { id: 'net-123' };
        const response = await (server as any).handleRestartNetwork(params);

        expect(testFramework.mockClient.restartNetwork).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Network restart');
      });

      it('should restart network with cleanup option', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.restartNetwork.mockResolvedValue(mockResponse);

        const params = { id: 'net-123', cleanup: true };
        const response = await (server as any).handleRestartNetwork(params);
        testFramework.expectSuccessResponse(response);
      });
    });
  });

  describe('VPC Operations', () => {
    describe('create_vpc', () => {
      it('should create VPC successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createVpc.mockResolvedValue(mockResponse);

        const params = {
          cidr: '10.0.0.0/16',
          displaytext: 'Test VPC',
          name: 'test-vpc',
          vpcofferingid: 'vpc-offering-123',
          zoneid: 'zone-123'
        };

        const response = await (server as any).handleCreateVpc(params);

        expect(testFramework.mockClient.createVpc).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VPC creation');
      });

      it('should fail when CIDR is missing', async () => {
        const params = {
          displaytext: 'Test VPC',
          name: 'test-vpc',
          vpcofferingid: 'vpc-offering-123',
          zoneid: 'zone-123'
        };

        await testFramework.expectError(
          () => (server as any).handleCreateVpc(params),
          'Missing required parameter: cidr'
        );
      });
    });

    describe('list_vpcs', () => {
      it('should list VPCs successfully', async () => {
        const response = await (server as any).handleListVpcs({});

        expect(testFramework.mockClient.listVpcs).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list VPCs with filtering', async () => {
        const params = {
          state: 'Enabled',
          zoneid: 'zone-123',
          account: 'test-account'
        };

        const response = await (server as any).handleListVpcs(params);

        expect(testFramework.mockClient.listVpcs).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('update_vpc', () => {
      it('should update VPC successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.updateVpc.mockResolvedValue(mockResponse);

        const params = {
          id: 'vpc-123',
          name: 'updated-vpc-name',
          displaytext: 'Updated VPC description'
        };

        const response = await (server as any).handleUpdateVpc(params);

        expect(testFramework.mockClient.updateVpc).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VPC update');
      });
    });

    describe('delete_vpc', () => {
      it('should delete VPC successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.deleteVpc.mockResolvedValue(mockResponse);

        const params = { id: 'vpc-123' };
        const response = await (server as any).handleDeleteVpc(params);

        expect(testFramework.mockClient.deleteVpc).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VPC deletion');
      });
    });

    describe('restart_vpc', () => {
      it('should restart VPC successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.restartVpc.mockResolvedValue(mockResponse);

        const params = { id: 'vpc-123' };
        const response = await (server as any).handleRestartVpc(params);

        expect(testFramework.mockClient.restartVpc).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VPC restart');
      });
    });
  });

  describe('Public IP Operations', () => {
    describe('associate_ip_address', () => {
      it('should associate IP address successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.associateIpAddress.mockResolvedValue(mockResponse);

        const params = {
          zoneid: 'zone-123'
        };

        const response = await (server as any).handleAssociateIpAddress(params);

        expect(testFramework.mockClient.associateIpAddress).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'IP address association');
      });

      it('should associate IP address with network', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.associateIpAddress.mockResolvedValue(mockResponse);

        const params = {
          zoneid: 'zone-123',
          networkid: 'net-456'
        };

        const response = await (server as any).handleAssociateIpAddress(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when zone ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleAssociateIpAddress({}),
          'Zone ID is required'
        );
      });
    });

    describe('disassociate_ip_address', () => {
      it('should disassociate IP address successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.disassociateIpAddress.mockResolvedValue(mockResponse);

        const params = { id: 'ip-123' };
        const response = await (server as any).handleDisassociateIpAddress(params);

        expect(testFramework.mockClient.disassociateIpAddress).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'IP address disassociation');
      });

      it('should fail when IP address ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleDisassociateIpAddress({}),
          'IP address ID is required'
        );
      });
    });

    describe('list_public_ip_addresses', () => {
      it('should list public IP addresses successfully', async () => {
        const response = await (server as any).handleListPublicIpAddresses({});

        expect(testFramework.mockClient.listPublicIpAddresses).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list public IP addresses with filtering', async () => {
        const params = {
          account: 'test-account',
          zoneid: 'zone-123',
          allocatedonly: true,
          isstaticnat: false
        };

        const response = await (server as any).handleListPublicIpAddresses(params);

        expect(testFramework.mockClient.listPublicIpAddresses).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('enable_static_nat', () => {
      it('should enable static NAT successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.enableStaticNat.mockResolvedValue(mockResponse);

        const params = {
          ipaddressid: 'ip-123',
          virtualmachineid: 'vm-456'
        };

        const response = await (server as any).handleEnableStaticNat(params);

        expect(testFramework.mockClient.enableStaticNat).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Static NAT enable');
      });

      it('should fail when IP address ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleEnableStaticNat({ virtualmachineid: 'vm-456' }),
          'IP address ID is required'
        );
      });

      it('should fail when VM ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleEnableStaticNat({ ipaddressid: 'ip-123' }),
          'Virtual machine ID is required'
        );
      });
    });

    describe('disable_static_nat', () => {
      it('should disable static NAT successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.disableStaticNat.mockResolvedValue(mockResponse);

        const params = { ipaddressid: 'ip-123' };
        const response = await (server as any).handleDisableStaticNat(params);

        expect(testFramework.mockClient.disableStaticNat).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Static NAT disable');
      });
    });
  });

  describe('Port Forwarding Operations', () => {
    describe('create_port_forwarding_rule', () => {
      it('should create port forwarding rule successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createPortForwardingRule.mockResolvedValue(mockResponse);

        const params = {
          ipaddressid: 'ip-123',
          privateport: '22',
          protocol: 'TCP',
          publicport: '2222',
          virtualmachineid: 'vm-456'
        };

        const response = await (server as any).handleCreatePortForwardingRule(params);

        expect(testFramework.mockClient.createPortForwardingRule).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Port forwarding rule creation');
      });

      it('should create port forwarding rule with port range', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createPortForwardingRule.mockResolvedValue(mockResponse);

        const params = {
          ipaddressid: 'ip-123',
          privateport: '8080',
          privateendport: '8090',
          protocol: 'TCP',
          publicport: '80',
          publicendport: '90',
          virtualmachineid: 'vm-456'
        };

        const response = await (server as any).handleCreatePortForwardingRule(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when required parameters are missing', async () => {
        const params = {
          privateport: '22',
          protocol: 'TCP',
          publicport: '2222'
        };

        await testFramework.expectError(
          () => (server as any).handleCreatePortForwardingRule(params),
          'Missing required parameter'
        );
      });
    });

    describe('list_port_forwarding_rules', () => {
      it('should list port forwarding rules successfully', async () => {
        const response = await (server as any).handleListPortForwardingRules({});

        expect(testFramework.mockClient.listPortForwardingRules).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list port forwarding rules with filtering', async () => {
        const params = {
          ipaddressid: 'ip-123',
          account: 'test-account'
        };

        const response = await (server as any).handleListPortForwardingRules(params);

        expect(testFramework.mockClient.listPortForwardingRules).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('delete_port_forwarding_rule', () => {
      it('should delete port forwarding rule successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.deletePortForwardingRule.mockResolvedValue(mockResponse);

        const params = { id: 'pf-rule-123' };
        const response = await (server as any).handleDeletePortForwardingRule(params);

        expect(testFramework.mockClient.deletePortForwardingRule).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Port forwarding rule deletion');
      });
    });
  });

  describe('Security Group Operations', () => {
    describe('create_security_group', () => {
      it('should create security group successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createSecurityGroup.mockResolvedValue(mockResponse);

        const params = {
          name: 'test-security-group',
          description: 'Test security group description'
        };

        const response = await (server as any).handleCreateSecurityGroup(params);

        expect(testFramework.mockClient.createSecurityGroup).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Security group creation');
      });

      it('should fail when name is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleCreateSecurityGroup({ description: 'Test description' }),
          'Security group name is required'
        );
      });
    });

    describe('list_security_groups', () => {
      it('should list security groups successfully', async () => {
        const response = await (server as any).handleListSecurityGroups({});

        expect(testFramework.mockClient.listSecurityGroups).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list security groups with filtering', async () => {
        const params = {
          account: 'test-account',
          keyword: 'web-servers'
        };

        const response = await (server as any).handleListSecurityGroups(params);

        expect(testFramework.mockClient.listSecurityGroups).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('delete_security_group', () => {
      it('should delete security group successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.deleteSecurityGroup.mockResolvedValue(mockResponse);

        const params = { id: 'sg-123' };
        const response = await (server as any).handleDeleteSecurityGroup(params);

        expect(testFramework.mockClient.deleteSecurityGroup).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Security group deletion');
      });
    });

    describe('authorize_security_group_ingress', () => {
      it('should authorize ingress rule successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.authorizeSecurityGroupIngress.mockResolvedValue(mockResponse);

        const params = {
          securitygroupid: 'sg-123',
          protocol: 'TCP',
          startport: '80',
          endport: '80',
          cidrlist: '0.0.0.0/0'
        };

        const response = await (server as any).handleAuthorizeSecurityGroupIngress(params);

        expect(testFramework.mockClient.authorizeSecurityGroupIngress).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Security group ingress authorization');
      });

      it('should authorize ingress rule with user security group', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.authorizeSecurityGroupIngress.mockResolvedValue(mockResponse);

        const params = {
          securitygroupid: 'sg-123',
          protocol: 'TCP',
          startport: '3306',
          endport: '3306',
          usersecuritygrouplist: [{ group: 'sg-web-servers', account: 'test-account' }]
        };

        const response = await (server as any).handleAuthorizeSecurityGroupIngress(params);
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('revoke_security_group_ingress', () => {
      it('should revoke ingress rule successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.revokeSecurityGroupIngress.mockResolvedValue(mockResponse);

        const params = { id: 'sg-rule-123' };
        const response = await (server as any).handleRevokeSecurityGroupIngress(params);

        expect(testFramework.mockClient.revokeSecurityGroupIngress).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Security group ingress revocation');
      });
    });

    describe('authorize_security_group_egress', () => {
      it('should authorize egress rule successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.authorizeSecurityGroupEgress.mockResolvedValue(mockResponse);

        const params = {
          securitygroupid: 'sg-123',
          protocol: 'TCP',
          startport: '443',
          endport: '443',
          cidrlist: '0.0.0.0/0'
        };

        const response = await (server as any).handleAuthorizeSecurityGroupEgress(params);

        expect(testFramework.mockClient.authorizeSecurityGroupEgress).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Security group egress authorization');
      });
    });

    describe('revoke_security_group_egress', () => {
      it('should revoke egress rule successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.revokeSecurityGroupEgress.mockResolvedValue(mockResponse);

        const params = { id: 'sg-egress-rule-123' };
        const response = await (server as any).handleRevokeSecurityGroupEgress(params);

        expect(testFramework.mockClient.revokeSecurityGroupEgress).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Security group egress revocation');
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network CIDR conflicts', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Network CIDR conflicts with existing network'
      );
      testFramework.mockClient.createNetwork.mockRejectedValue(error);

      const params = {
        displaytext: 'Conflicting Network',
        name: 'conflict-network',
        networkofferingid: 'net-offering-123',
        zoneid: 'zone-123',
        gateway: '192.168.1.1',
        netmask: '255.255.255.0'
      };

      await testFramework.expectError(
        () => (server as any).handleCreateNetwork(params),
        'CIDR conflicts'
      );
    });

    it('should handle VPC in use deletion attempts', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Cannot delete VPC that has networks'
      );
      testFramework.mockClient.deleteVpc.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleDeleteVpc({ id: 'vpc-with-networks' }),
        'Cannot delete VPC'
      );
    });

    it('should handle port forwarding conflicts', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Public port 80 is already in use'
      );
      testFramework.mockClient.createPortForwardingRule.mockRejectedValue(error);

      const params = {
        ipaddressid: 'ip-123',
        privateport: '8080',
        protocol: 'TCP',
        publicport: '80',
        virtualmachineid: 'vm-456'
      };

      await testFramework.expectError(
        () => (server as any).handleCreatePortForwardingRule(params),
        'already in use'
      );
    });

    it('should handle security group rule conflicts', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Duplicate security group rule'
      );
      testFramework.mockClient.authorizeSecurityGroupIngress.mockRejectedValue(error);

      const params = {
        securitygroupid: 'sg-123',
        protocol: 'TCP',
        startport: '22',
        endport: '22',
        cidrlist: '0.0.0.0/0'
      };

      await testFramework.expectError(
        () => (server as any).handleAuthorizeSecurityGroupIngress(params),
        'Duplicate security group rule'
      );
    });

    it('should handle insufficient IP addresses', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'No available public IP addresses in the zone'
      );
      testFramework.mockClient.associateIpAddress.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleAssociateIpAddress({ zoneid: 'zone-full' }),
        'No available public IP'
      );
    });

    it('should handle network offering restrictions', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Network offering is not available in this zone'
      );
      testFramework.mockClient.createNetwork.mockRejectedValue(error);

      const params = {
        displaytext: 'Restricted Network',
        name: 'restricted-network',
        networkofferingid: 'restricted-offering',
        zoneid: 'zone-123'
      };

      await testFramework.expectError(
        () => (server as any).handleCreateNetwork(params),
        'not available in this zone'
      );
    });

    it('should handle permission errors for network operations', async () => {
      const error = testFramework.createErrorResponse(
        401,
        'Access denied to network resource'
      );
      testFramework.mockClient.deleteNetwork.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleDeleteNetwork({ id: 'net-restricted' }),
        'Access denied'
      );
    });
  });
});