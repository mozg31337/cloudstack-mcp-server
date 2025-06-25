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

describe('VPN Operations - Comprehensive Test Suite', () => {
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

  describe('VPN Gateway Operations', () => {
    describe('create_vpn_gateway', () => {
      it('should create VPN gateway successfully with required parameters', async () => {
        const mockResponse = testFramework.createAsyncJobResponse('create-vpn-gw-job-123');
        testFramework.mockClient.createVpnGateway.mockResolvedValue(mockResponse);

        const params = {
          vpcid: 'vpc-123'
        };

        const response = await (server as any).handleCreateVpnGateway(params);

        expect(testFramework.mockClient.createVpnGateway).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response, 'VPN gateway creation');
      });

      it('should create VPN gateway with optional parameters', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createVpnGateway.mockResolvedValue(mockResponse);

        const params = {
          vpcid: 'vpc-123',
          account: 'test-account',
          domainid: 'domain-123'
        };

        const response = await (server as any).handleCreateVpnGateway(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when VPC ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleCreateVpnGateway({}),
          'VPC ID is required'
        );
      });
    });

    describe('list_vpn_gateways', () => {
      it('should list VPN gateways successfully', async () => {
        const response = await (server as any).handleListVpnGateways({});

        expect(testFramework.mockClient.listVpnGateways).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list VPN gateways with filtering parameters', async () => {
        const params = {
          vpcid: 'vpc-123',
          account: 'test-account',
          zoneid: 'zone-123'
        };

        const response = await (server as any).handleListVpnGateways(params);

        expect(testFramework.mockClient.listVpnGateways).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('update_vpn_gateway', () => {
      it('should update VPN gateway successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.updateVpnGateway.mockResolvedValue(mockResponse);

        const params = {
          id: 'vpn-gw-123',
          customid: 'updated-custom-id'
        };

        const response = await (server as any).handleUpdateVpnGateway(params);

        expect(testFramework.mockClient.updateVpnGateway).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VPN gateway update');
      });

      it('should fail when gateway ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleUpdateVpnGateway({ customid: 'test-id' }),
          'VPN gateway ID is required'
        );
      });
    });

    describe('delete_vpn_gateway', () => {
      it('should delete VPN gateway successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.deleteVpnGateway.mockResolvedValue(mockResponse);

        const params = { id: 'vpn-gw-123' };
        const response = await (server as any).handleDeleteVpnGateway(params);

        expect(testFramework.mockClient.deleteVpnGateway).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VPN gateway deletion');
      });

      it('should fail when gateway ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleDeleteVpnGateway({}),
          'VPN gateway ID is required'
        );
      });
    });

    describe('enable_vpn_gateway', () => {
      it('should enable VPN gateway successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.enableVpnGateway.mockResolvedValue(mockResponse);

        const params = { id: 'vpn-gw-123' };
        const response = await (server as any).handleEnableVpnGateway(params);

        expect(testFramework.mockClient.enableVpnGateway).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VPN gateway enable');
      });
    });

    describe('disable_vpn_gateway', () => {
      it('should disable VPN gateway successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.disableVpnGateway.mockResolvedValue(mockResponse);

        const params = { id: 'vpn-gw-123' };
        const response = await (server as any).handleDisableVpnGateway(params);

        expect(testFramework.mockClient.disableVpnGateway).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VPN gateway disable');
      });
    });

    describe('restart_vpn_gateway', () => {
      it('should restart VPN gateway successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.restartVpnGateway.mockResolvedValue(mockResponse);

        const params = { id: 'vpn-gw-123' };
        const response = await (server as any).handleRestartVpnGateway(params);

        expect(testFramework.mockClient.restartVpnGateway).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VPN gateway restart');
      });
    });
  });

  describe('Customer Gateway Operations', () => {
    describe('create_vpn_customer_gateway', () => {
      it('should create VPN customer gateway successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createVpnCustomerGateway.mockResolvedValue(mockResponse);

        const params = {
          cidrlist: '192.168.1.0/24',
          esppolicy: 'aes128-sha1',
          gateway: '203.0.113.10',
          ikepolicy: 'aes128-sha1',
          ipsecpsk: 'sharedSecretKey123',
          name: 'test-customer-gateway'
        };

        const response = await (server as any).handleCreateVpnCustomerGateway(params);

        expect(testFramework.mockClient.createVpnCustomerGateway).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VPN customer gateway creation');
      });

      it('should create VPN customer gateway with optional parameters', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createVpnCustomerGateway.mockResolvedValue(mockResponse);

        const params = {
          cidrlist: '192.168.1.0/24',
          esppolicy: 'aes256-sha256',
          gateway: '203.0.113.10',
          ikepolicy: 'aes256-sha256',
          ipsecpsk: 'sharedSecretKey123',
          name: 'test-customer-gateway',
          account: 'test-account',
          domainid: 'domain-123',
          ikelifetime: 86400,
          esplifetime: 3600,
          dpd: true
        };

        const response = await (server as any).handleCreateVpnCustomerGateway(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when gateway IP is missing', async () => {
        const params = {
          cidrlist: '192.168.1.0/24',
          esppolicy: 'aes128-sha1',
          ikepolicy: 'aes128-sha1',
          ipsecpsk: 'sharedSecretKey123',
          name: 'test-customer-gateway'
        };

        await testFramework.expectError(
          () => (server as any).handleCreateVpnCustomerGateway(params),
          'Gateway IP is required'
        );
      });

      it('should fail when CIDR list is missing', async () => {
        const params = {
          esppolicy: 'aes128-sha1',
          gateway: '203.0.113.10',
          ikepolicy: 'aes128-sha1',
          ipsecpsk: 'sharedSecretKey123',
          name: 'test-customer-gateway'
        };

        await testFramework.expectError(
          () => (server as any).handleCreateVpnCustomerGateway(params),
          'CIDR list is required'
        );
      });

      it('should fail when PSK is missing', async () => {
        const params = {
          cidrlist: '192.168.1.0/24',
          esppolicy: 'aes128-sha1',
          gateway: '203.0.113.10',
          ikepolicy: 'aes128-sha1',
          name: 'test-customer-gateway'
        };

        await testFramework.expectError(
          () => (server as any).handleCreateVpnCustomerGateway(params),
          'IPSec PSK is required'
        );
      });
    });

    describe('list_vpn_customer_gateways', () => {
      it('should list VPN customer gateways successfully', async () => {
        const response = await (server as any).handleListVpnCustomerGateways({});

        expect(testFramework.mockClient.listVpnCustomerGateways).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list VPN customer gateways with filtering', async () => {
        const params = {
          account: 'test-account',
          keyword: 'production'
        };

        const response = await (server as any).handleListVpnCustomerGateways(params);

        expect(testFramework.mockClient.listVpnCustomerGateways).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('update_vpn_customer_gateway', () => {
      it('should update VPN customer gateway successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.updateVpnCustomerGateway.mockResolvedValue(mockResponse);

        const params = {
          id: 'customer-gw-123',
          name: 'updated-customer-gateway',
          cidrlist: '192.168.0.0/24,192.168.2.0/24'
        };

        const response = await (server as any).handleUpdateVpnCustomerGateway(params);

        expect(testFramework.mockClient.updateVpnCustomerGateway).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VPN customer gateway update');
      });

      it('should fail when customer gateway ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleUpdateVpnCustomerGateway({ name: 'updated-name' }),
          'VPN customer gateway ID is required'
        );
      });
    });

    describe('delete_vpn_customer_gateway', () => {
      it('should delete VPN customer gateway successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.deleteVpnCustomerGateway.mockResolvedValue(mockResponse);

        const params = { id: 'customer-gw-123' };
        const response = await (server as any).handleDeleteVpnCustomerGateway(params);

        expect(testFramework.mockClient.deleteVpnCustomerGateway).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VPN customer gateway deletion');
      });
    });
  });

  describe('Site-to-Site VPN Connection Operations', () => {
    describe('create_vpn_connection', () => {
      it('should create VPN connection successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createVpnConnection.mockResolvedValue(mockResponse);

        const params = {
          s2scustomergatewayid: 'customer-gw-123',
          s2svpngatewayid: 'vpn-gw-456'
        };

        const response = await (server as any).handleCreateVpnConnection(params);

        expect(testFramework.mockClient.createVpnConnection).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VPN connection creation');
      });

      it('should create VPN connection with passive mode', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createVpnConnection.mockResolvedValue(mockResponse);

        const params = {
          s2scustomergatewayid: 'customer-gw-123',
          s2svpngatewayid: 'vpn-gw-456',
          passive: true
        };

        const response = await (server as any).handleCreateVpnConnection(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when customer gateway ID is missing', async () => {
        const params = {
          s2svpngatewayid: 'vpn-gw-456'
        };

        await testFramework.expectError(
          () => (server as any).handleCreateVpnConnection(params),
          'Customer gateway ID is required'
        );
      });

      it('should fail when VPN gateway ID is missing', async () => {
        const params = {
          s2scustomergatewayid: 'customer-gw-123'
        };

        await testFramework.expectError(
          () => (server as any).handleCreateVpnConnection(params),
          'VPN gateway ID is required'
        );
      });
    });

    describe('list_vpn_connections', () => {
      it('should list VPN connections successfully', async () => {
        const response = await (server as any).handleListVpnConnections({});

        expect(testFramework.mockClient.listVpnConnections).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list VPN connections with filtering', async () => {
        const params = {
          vpcid: 'vpc-123',
          account: 'test-account'
        };

        const response = await (server as any).handleListVpnConnections(params);

        expect(testFramework.mockClient.listVpnConnections).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('update_vpn_connection', () => {
      it('should update VPN connection successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.updateVpnConnection.mockResolvedValue(mockResponse);

        const params = {
          id: 'vpn-conn-123',
          customid: 'updated-connection-id'
        };

        const response = await (server as any).handleUpdateVpnConnection(params);

        expect(testFramework.mockClient.updateVpnConnection).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VPN connection update');
      });
    });

    describe('reset_vpn_connection', () => {
      it('should reset VPN connection successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.resetVpnConnection.mockResolvedValue(mockResponse);

        const params = { id: 'vpn-conn-123' };
        const response = await (server as any).handleResetVpnConnection(params);

        expect(testFramework.mockClient.resetVpnConnection).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VPN connection reset');
      });

      it('should fail when connection ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleResetVpnConnection({}),
          'VPN connection ID is required'
        );
      });
    });

    describe('delete_vpn_connection', () => {
      it('should delete VPN connection successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.deleteVpnConnection.mockResolvedValue(mockResponse);

        const params = { id: 'vpn-conn-123' };
        const response = await (server as any).handleDeleteVpnConnection(params);

        expect(testFramework.mockClient.deleteVpnConnection).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VPN connection deletion');
      });
    });
  });

  describe('Remote Access VPN Operations', () => {
    describe('create_remote_access_vpn', () => {
      it('should create remote access VPN successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createRemoteAccessVpn.mockResolvedValue(mockResponse);

        const params = {
          publicipid: 'ip-123'
        };

        const response = await (server as any).handleCreateRemoteAccessVpn(params);

        expect(testFramework.mockClient.createRemoteAccessVpn).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Remote access VPN creation');
      });

      it('should create remote access VPN with optional parameters', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createRemoteAccessVpn.mockResolvedValue(mockResponse);

        const params = {
          publicipid: 'ip-123',
          account: 'test-account',
          domainid: 'domain-123',
          iprange: '192.168.100.1-192.168.100.100',
          openfirewall: true
        };

        const response = await (server as any).handleCreateRemoteAccessVpn(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when public IP ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleCreateRemoteAccessVpn({}),
          'Public IP ID is required'
        );
      });
    });

    describe('list_remote_access_vpns', () => {
      it('should list remote access VPNs successfully', async () => {
        const response = await (server as any).handleListRemoteAccessVpns({});

        expect(testFramework.mockClient.listRemoteAccessVpns).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list remote access VPNs with filtering', async () => {
        const params = {
          publicipid: 'ip-123',
          account: 'test-account'
        };

        const response = await (server as any).handleListRemoteAccessVpns(params);

        expect(testFramework.mockClient.listRemoteAccessVpns).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('update_remote_access_vpn', () => {
      it('should update remote access VPN successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.updateRemoteAccessVpn.mockResolvedValue(mockResponse);

        const params = {
          id: 'remote-vpn-123',
          customid: 'updated-remote-vpn'
        };

        const response = await (server as any).handleUpdateRemoteAccessVpn(params);

        expect(testFramework.mockClient.updateRemoteAccessVpn).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Remote access VPN update');
      });
    });

    describe('delete_remote_access_vpn', () => {
      it('should delete remote access VPN successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.deleteRemoteAccessVpn.mockResolvedValue(mockResponse);

        const params = { publicipid: 'ip-123' };
        const response = await (server as any).handleDeleteRemoteAccessVpn(params);

        expect(testFramework.mockClient.deleteRemoteAccessVpn).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Remote access VPN deletion');
      });

      it('should fail when public IP ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleDeleteRemoteAccessVpn({}),
          'Public IP ID is required'
        );
      });
    });
  });

  describe('VPN User Management', () => {
    describe('add_vpn_user', () => {
      it('should add VPN user successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.addVpnUser.mockResolvedValue(mockResponse);

        const params = {
          password: 'securePassword123',
          username: 'vpnuser1'
        };

        const response = await (server as any).handleAddVpnUser(params);

        expect(testFramework.mockClient.addVpnUser).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VPN user addition');
      });

      it('should add VPN user with optional parameters', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.addVpnUser.mockResolvedValue(mockResponse);

        const params = {
          password: 'securePassword123',
          username: 'vpnuser1',
          account: 'test-account',
          domainid: 'domain-123'
        };

        const response = await (server as any).handleAddVpnUser(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when username is missing', async () => {
        const params = {
          password: 'securePassword123'
        };

        await testFramework.expectError(
          () => (server as any).handleAddVpnUser(params),
          'Username is required'
        );
      });

      it('should fail when password is missing', async () => {
        const params = {
          username: 'vpnuser1'
        };

        await testFramework.expectError(
          () => (server as any).handleAddVpnUser(params),
          'Password is required'
        );
      });
    });

    describe('list_vpn_users', () => {
      it('should list VPN users successfully', async () => {
        const response = await (server as any).handleListVpnUsers({});

        expect(testFramework.mockClient.listVpnUsers).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list VPN users with filtering', async () => {
        const params = {
          account: 'test-account',
          keyword: 'vpnuser'
        };

        const response = await (server as any).handleListVpnUsers(params);

        expect(testFramework.mockClient.listVpnUsers).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('remove_vpn_user', () => {
      it('should remove VPN user successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.removeVpnUser.mockResolvedValue(mockResponse);

        const params = {
          username: 'vpnuser1'
        };

        const response = await (server as any).handleRemoveVpnUser(params);

        expect(testFramework.mockClient.removeVpnUser).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VPN user removal');
      });

      it('should remove VPN user with account specification', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.removeVpnUser.mockResolvedValue(mockResponse);

        const params = {
          username: 'vpnuser1',
          account: 'test-account',
          domainid: 'domain-123'
        };

        const response = await (server as any).handleRemoveVpnUser(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when username is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleRemoveVpnUser({}),
          'Username is required'
        );
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle VPN gateway already exists for VPC', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'VPN gateway already exists for this VPC'
      );
      testFramework.mockClient.createVpnGateway.mockRejectedValue(error);

      const params = {
        vpcid: 'vpc-with-gateway'
      };

      await testFramework.expectError(
        () => (server as any).handleCreateVpnGateway(params),
        'already exists'
      );
    });

    it('should handle invalid CIDR format in customer gateway', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Invalid CIDR format in CIDR list'
      );
      testFramework.mockClient.createVpnCustomerGateway.mockRejectedValue(error);

      const params = {
        cidrlist: 'invalid-cidr-format',
        esppolicy: 'aes128-sha1',
        gateway: '203.0.113.10',
        ikepolicy: 'aes128-sha1',
        ipsecpsk: 'sharedSecretKey123',
        name: 'invalid-customer-gateway'
      };

      await testFramework.expectError(
        () => (server as any).handleCreateVpnCustomerGateway(params),
        'Invalid CIDR format'
      );
    });

    it('should handle VPN connection already exists', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'VPN connection already exists between these gateways'
      );
      testFramework.mockClient.createVpnConnection.mockRejectedValue(error);

      const params = {
        s2scustomergatewayid: 'customer-gw-123',
        s2svpngatewayid: 'vpn-gw-456'
      };

      await testFramework.expectError(
        () => (server as any).handleCreateVpnConnection(params),
        'already exists'
      );
    });

    it('should handle remote access VPN already enabled for IP', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Remote access VPN is already enabled for this public IP'
      );
      testFramework.mockClient.createRemoteAccessVpn.mockRejectedValue(error);

      const params = {
        publicipid: 'ip-with-vpn'
      };

      await testFramework.expectError(
        () => (server as any).handleCreateRemoteAccessVpn(params),
        'already enabled'
      );
    });

    it('should handle VPN user already exists', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'VPN user with this username already exists'
      );
      testFramework.mockClient.addVpnUser.mockRejectedValue(error);

      const params = {
        password: 'securePassword123',
        username: 'existinguser'
      };

      await testFramework.expectError(
        () => (server as any).handleAddVpnUser(params),
        'already exists'
      );
    });

    it('should handle VPN gateway in use deletion attempts', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Cannot delete VPN gateway that has active connections'
      );
      testFramework.mockClient.deleteVpnGateway.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleDeleteVpnGateway({ id: 'vpn-gw-with-connections' }),
        'Cannot delete VPN gateway'
      );
    });

    it('should handle customer gateway in use deletion attempts', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Cannot delete customer gateway that is part of active VPN connections'
      );
      testFramework.mockClient.deleteVpnCustomerGateway.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleDeleteVpnCustomerGateway({ id: 'customer-gw-in-use' }),
        'Cannot delete customer gateway'
      );
    });

    it('should handle permission errors for VPN operations', async () => {
      const error = testFramework.createErrorResponse(
        401,
        'Access denied to VPN resource'
      );
      testFramework.mockClient.updateVpnGateway.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleUpdateVpnGateway({ id: 'vpn-gw-restricted' }),
        'Access denied'
      );
    });

    it('should handle network timeout during VPN operations', async () => {
      const timeoutError = new Error('VPN operation timeout');
      (timeoutError as any).code = 'ECONNABORTED';
      testFramework.mockClient.createVpnConnection.mockRejectedValue(timeoutError);

      const params = {
        s2scustomergatewayid: 'customer-gw-123',
        s2svpngatewayid: 'vpn-gw-456'
      };

      await testFramework.expectError(
        () => (server as any).handleCreateVpnConnection(params),
        'VPN operation timeout'
      );
    });
  });
});