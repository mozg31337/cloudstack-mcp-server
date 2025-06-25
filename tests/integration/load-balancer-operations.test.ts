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

describe('Load Balancer Operations - Comprehensive Test Suite', () => {
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

  describe('Load Balancer Rule Operations', () => {
    describe('create_load_balancer_rule', () => {
      it('should create load balancer rule successfully with required parameters', async () => {
        const mockResponse = testFramework.createAsyncJobResponse('create-lb-rule-job-123');
        testFramework.mockClient.createLoadBalancerRule.mockResolvedValue(mockResponse);

        const params = {
          algorithm: 'roundrobin',
          name: 'test-lb-rule',
          privateport: '80',
          publicipid: 'ip-123',
          publicport: '80'
        };

        const response = await (server as any).handleCreateLoadBalancerRule(params);

        expect(testFramework.mockClient.createLoadBalancerRule).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response, 'Load balancer rule creation');
      });

      it('should create load balancer rule with optional parameters', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createLoadBalancerRule.mockResolvedValue(mockResponse);

        const params = {
          algorithm: 'leastconn',
          name: 'test-lb-rule',
          privateport: '443',
          publicipid: 'ip-123',
          publicport: '443',
          description: 'HTTPS load balancer rule',
          protocol: 'TCP',
          networkid: 'network-456',
          zoneid: 'zone-123'
        };

        const response = await (server as any).handleCreateLoadBalancerRule(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when name is missing', async () => {
        const params = {
          algorithm: 'roundrobin',
          privateport: '80',
          publicipid: 'ip-123',
          publicport: '80'
        };

        await testFramework.expectError(
          () => (server as any).handleCreateLoadBalancerRule(params),
          'Missing required parameter: name'
        );
      });

      it('should fail when public IP ID is missing', async () => {
        const params = {
          algorithm: 'roundrobin',
          name: 'test-lb-rule',
          privateport: '80',
          publicport: '80'
        };

        await testFramework.expectError(
          () => (server as any).handleCreateLoadBalancerRule(params),
          'Missing required parameter: publicipid'
        );
      });

      it('should fail when algorithm is missing', async () => {
        const params = {
          name: 'test-lb-rule',
          privateport: '80',
          publicipid: 'ip-123',
          publicport: '80'
        };

        await testFramework.expectError(
          () => (server as any).handleCreateLoadBalancerRule(params),
          'Missing required parameter: algorithm'
        );
      });
    });

    describe('list_load_balancer_rules', () => {
      it('should list load balancer rules successfully', async () => {
        const response = await (server as any).handleListLoadBalancerRules({});

        expect(testFramework.mockClient.listLoadBalancerRules).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list load balancer rules with filtering parameters', async () => {
        const params = {
          publicipid: 'ip-123',
          account: 'test-account',
          zoneid: 'zone-123',
          keyword: 'web-lb'
        };

        const response = await (server as any).handleListLoadBalancerRules(params);

        expect(testFramework.mockClient.listLoadBalancerRules).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('update_load_balancer_rule', () => {
      it('should update load balancer rule successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.updateLoadBalancerRule.mockResolvedValue(mockResponse);

        const params = {
          id: 'lb-rule-123',
          algorithm: 'leastconn',
          description: 'Updated load balancer rule'
        };

        const response = await (server as any).handleUpdateLoadBalancerRule(params);

        expect(testFramework.mockClient.updateLoadBalancerRule).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Load balancer rule update');
      });

      it('should fail when rule ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleUpdateLoadBalancerRule({ algorithm: 'leastconn' }),
          'Load balancer rule ID is required'
        );
      });
    });

    describe('delete_load_balancer_rule', () => {
      it('should delete load balancer rule successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.deleteLoadBalancerRule.mockResolvedValue(mockResponse);

        const params = { id: 'lb-rule-123' };
        const response = await (server as any).handleDeleteLoadBalancerRule(params);

        expect(testFramework.mockClient.deleteLoadBalancerRule).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Load balancer rule deletion');
      });

      it('should fail when rule ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleDeleteLoadBalancerRule({}),
          'Load balancer rule ID is required'
        );
      });
    });

    describe('assign_to_load_balancer_rule', () => {
      it('should assign VMs to load balancer rule successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.assignToLoadBalancerRule.mockResolvedValue(mockResponse);

        const params = {
          id: 'lb-rule-123',
          virtualmachineids: 'vm-1,vm-2,vm-3'
        };

        const response = await (server as any).handleAssignToLoadBalancerRule(params);

        expect(testFramework.mockClient.assignToLoadBalancerRule).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VM assignment to load balancer rule');
      });

      it('should fail when rule ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleAssignToLoadBalancerRule({ 
            virtualmachineids: 'vm-1,vm-2' 
          }),
          'Load balancer rule ID is required'
        );
      });

      it('should fail when VM IDs are missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleAssignToLoadBalancerRule({ id: 'lb-rule-123' }),
          'Virtual machine IDs are required'
        );
      });
    });

    describe('remove_from_load_balancer_rule', () => {
      it('should remove VMs from load balancer rule successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.removeFromLoadBalancerRule.mockResolvedValue(mockResponse);

        const params = {
          id: 'lb-rule-123',
          virtualmachineids: 'vm-1,vm-2'
        };

        const response = await (server as any).handleRemoveFromLoadBalancerRule(params);

        expect(testFramework.mockClient.removeFromLoadBalancerRule).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'VM removal from load balancer rule');
      });

      it('should fail when rule ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleRemoveFromLoadBalancerRule({ 
            virtualmachineids: 'vm-1,vm-2' 
          }),
          'Load balancer rule ID is required'
        );
      });
    });
  });

  describe('Health Check Policy Operations', () => {
    describe('create_lb_health_check_policy', () => {
      it('should create health check policy successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createLbHealthCheckPolicy.mockResolvedValue(mockResponse);

        const params = {
          lbruleid: 'lb-rule-123',
          pingpath: '/health',
          intervaltime: 5,
          responsetimeout: 2,
          healthythreshold: 2,
          unhealthythreshold: 3
        };

        const response = await (server as any).handleCreateLbHealthCheckPolicy(params);

        expect(testFramework.mockClient.createLbHealthCheckPolicy).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Health check policy creation');
      });

      it('should fail when load balancer rule ID is missing', async () => {
        const params = {
          pingpath: '/health',
          intervaltime: 5,
          responsetimeout: 2
        };

        await testFramework.expectError(
          () => (server as any).handleCreateLbHealthCheckPolicy(params),
          'Load balancer rule ID is required'
        );
      });
    });

    describe('list_lb_health_check_policies', () => {
      it('should list health check policies successfully', async () => {
        const response = await (server as any).handleListLbHealthCheckPolicies({});

        expect(testFramework.mockClient.listLbHealthCheckPolicies).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list health check policies with filtering', async () => {
        const params = {
          lbruleid: 'lb-rule-123'
        };

        const response = await (server as any).handleListLbHealthCheckPolicies(params);

        expect(testFramework.mockClient.listLbHealthCheckPolicies).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('update_lb_health_check_policy', () => {
      it('should update health check policy successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.updateLbHealthCheckPolicy.mockResolvedValue(mockResponse);

        const params = {
          id: 'health-policy-123',
          intervaltime: 10,
          responsetimeout: 5
        };

        const response = await (server as any).handleUpdateLbHealthCheckPolicy(params);

        expect(testFramework.mockClient.updateLbHealthCheckPolicy).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Health check policy update');
      });
    });

    describe('delete_lb_health_check_policy', () => {
      it('should delete health check policy successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.deleteLbHealthCheckPolicy.mockResolvedValue(mockResponse);

        const params = { id: 'health-policy-123' };
        const response = await (server as any).handleDeleteLbHealthCheckPolicy(params);

        expect(testFramework.mockClient.deleteLbHealthCheckPolicy).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Health check policy deletion');
      });
    });
  });

  describe('Stickiness Policy Operations', () => {
    describe('create_lb_stickiness_policy', () => {
      it('should create stickiness policy successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createLbStickinessPolicy.mockResolvedValue(mockResponse);

        const params = {
          lbruleid: 'lb-rule-123',
          methodname: 'LbCookie',
          name: 'test-stickiness-policy'
        };

        const response = await (server as any).handleCreateLbStickinessPolicy(params);

        expect(testFramework.mockClient.createLbStickinessPolicy).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Stickiness policy creation');
      });

      it('should create stickiness policy with parameters', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createLbStickinessPolicy.mockResolvedValue(mockResponse);

        const params = {
          lbruleid: 'lb-rule-123',
          methodname: 'AppCookie',
          name: 'app-stickiness-policy',
          param: [{ name: 'cookie-name', value: 'JSESSIONID' }]
        };

        const response = await (server as any).handleCreateLbStickinessPolicy(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when load balancer rule ID is missing', async () => {
        const params = {
          methodname: 'LbCookie',
          name: 'test-stickiness-policy'
        };

        await testFramework.expectError(
          () => (server as any).handleCreateLbStickinessPolicy(params),
          'Load balancer rule ID is required'
        );
      });

      it('should fail when method name is missing', async () => {
        const params = {
          lbruleid: 'lb-rule-123',
          name: 'test-stickiness-policy'
        };

        await testFramework.expectError(
          () => (server as any).handleCreateLbStickinessPolicy(params),
          'Method name is required'
        );
      });
    });

    describe('list_lb_stickiness_policies', () => {
      it('should list stickiness policies successfully', async () => {
        const response = await (server as any).handleListLbStickinessPolicies({});

        expect(testFramework.mockClient.listLbStickinessPolicies).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list stickiness policies with filtering', async () => {
        const params = {
          lbruleid: 'lb-rule-123'
        };

        const response = await (server as any).handleListLbStickinessPolicies(params);

        expect(testFramework.mockClient.listLbStickinessPolicies).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('update_lb_stickiness_policy', () => {
      it('should update stickiness policy successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.updateLbStickinessPolicy.mockResolvedValue(mockResponse);

        const params = {
          id: 'stickiness-policy-123',
          name: 'updated-stickiness-policy'
        };

        const response = await (server as any).handleUpdateLbStickinessPolicy(params);

        expect(testFramework.mockClient.updateLbStickinessPolicy).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Stickiness policy update');
      });
    });

    describe('delete_lb_stickiness_policy', () => {
      it('should delete stickiness policy successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.deleteLbStickinessPolicy.mockResolvedValue(mockResponse);

        const params = { id: 'stickiness-policy-123' };
        const response = await (server as any).handleDeleteLbStickinessPolicy(params);

        expect(testFramework.mockClient.deleteLbStickinessPolicy).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Stickiness policy deletion');
      });
    });
  });

  describe('SSL Certificate Operations', () => {
    describe('upload_ssl_cert', () => {
      it('should upload SSL certificate successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.uploadSslCert.mockResolvedValue(mockResponse);

        const params = {
          certificate: '-----BEGIN CERTIFICATE-----\nMIIC...\n-----END CERTIFICATE-----',
          privatekey: '-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----',
          name: 'test-ssl-cert'
        };

        const response = await (server as any).handleUploadSslCert(params);

        expect(testFramework.mockClient.uploadSslCert).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'SSL certificate upload');
      });

      it('should upload SSL certificate with certificate chain', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.uploadSslCert.mockResolvedValue(mockResponse);

        const params = {
          certificate: '-----BEGIN CERTIFICATE-----\nMIIC...\n-----END CERTIFICATE-----',
          privatekey: '-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----',
          certchain: '-----BEGIN CERTIFICATE-----\nMIID...\n-----END CERTIFICATE-----',
          name: 'test-ssl-cert-with-chain'
        };

        const response = await (server as any).handleUploadSslCert(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when certificate is missing', async () => {
        const params = {
          privatekey: '-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----',
          name: 'test-ssl-cert'
        };

        await testFramework.expectError(
          () => (server as any).handleUploadSslCert(params),
          'Certificate is required'
        );
      });

      it('should fail when private key is missing', async () => {
        const params = {
          certificate: '-----BEGIN CERTIFICATE-----\nMIIC...\n-----END CERTIFICATE-----',
          name: 'test-ssl-cert'
        };

        await testFramework.expectError(
          () => (server as any).handleUploadSslCert(params),
          'Private key is required'
        );
      });
    });

    describe('list_ssl_certs', () => {
      it('should list SSL certificates successfully', async () => {
        const response = await (server as any).handleListSslCerts({});

        expect(testFramework.mockClient.listSslCerts).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list SSL certificates with filtering', async () => {
        const params = {
          account: 'test-account',
          lbruleid: 'lb-rule-123'
        };

        const response = await (server as any).handleListSslCerts(params);

        expect(testFramework.mockClient.listSslCerts).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('update_ssl_cert', () => {
      it('should update SSL certificate successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.updateSslCert.mockResolvedValue(mockResponse);

        const params = {
          id: 'ssl-cert-123',
          name: 'updated-ssl-cert-name'
        };

        const response = await (server as any).handleUpdateSslCert(params);

        expect(testFramework.mockClient.updateSslCert).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'SSL certificate update');
      });
    });

    describe('delete_ssl_cert', () => {
      it('should delete SSL certificate successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.deleteSslCert.mockResolvedValue(mockResponse);

        const params = { id: 'ssl-cert-123' };
        const response = await (server as any).handleDeleteSslCert(params);

        expect(testFramework.mockClient.deleteSslCert).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'SSL certificate deletion');
      });
    });
  });

  describe('Application Load Balancer Operations', () => {
    describe('create_application_load_balancer', () => {
      it('should create application load balancer successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createApplicationLoadBalancer.mockResolvedValue(mockResponse);

        const params = {
          name: 'test-app-lb',
          sourceipaddressnetworkid: 'network-123',
          scheme: 'Internal'
        };

        const response = await (server as any).handleCreateApplicationLoadBalancer(params);

        expect(testFramework.mockClient.createApplicationLoadBalancer).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Application load balancer creation');
      });

      it('should fail when name is missing', async () => {
        const params = {
          sourceipaddressnetworkid: 'network-123',
          scheme: 'Internal'
        };

        await testFramework.expectError(
          () => (server as any).handleCreateApplicationLoadBalancer(params),
          'Application load balancer name is required'
        );
      });
    });

    describe('list_application_load_balancers', () => {
      it('should list application load balancers successfully', async () => {
        const response = await (server as any).handleListApplicationLoadBalancers({});

        expect(testFramework.mockClient.listApplicationLoadBalancers).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list application load balancers with filtering', async () => {
        const params = {
          scheme: 'Internal',
          keyword: 'production'
        };

        const response = await (server as any).handleListApplicationLoadBalancers(params);

        expect(testFramework.mockClient.listApplicationLoadBalancers).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('update_application_load_balancer', () => {
      it('should update application load balancer successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.updateApplicationLoadBalancer.mockResolvedValue(mockResponse);

        const params = {
          id: 'app-lb-123',
          name: 'updated-app-lb-name'
        };

        const response = await (server as any).handleUpdateApplicationLoadBalancer(params);

        expect(testFramework.mockClient.updateApplicationLoadBalancer).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Application load balancer update');
      });
    });

    describe('delete_application_load_balancer', () => {
      it('should delete application load balancer successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.deleteApplicationLoadBalancer.mockResolvedValue(mockResponse);

        const params = { id: 'app-lb-123' };
        const response = await (server as any).handleDeleteApplicationLoadBalancer(params);

        expect(testFramework.mockClient.deleteApplicationLoadBalancer).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Application load balancer deletion');
      });
    });
  });

  describe('Monitoring and Metrics', () => {
    describe('list_load_balancer_metrics', () => {
      it('should list load balancer metrics successfully', async () => {
        const response = await (server as any).handleListLoadBalancerMetrics({});

        expect(testFramework.mockClient.listLoadBalancerMetrics).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list load balancer metrics with filtering', async () => {
        const params = {
          id: 'lb-rule-123',
          account: 'test-account'
        };

        const response = await (server as any).handleListLoadBalancerMetrics(params);

        expect(testFramework.mockClient.listLoadBalancerMetrics).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('get_load_balancer_health', () => {
      it('should get load balancer health successfully', async () => {
        const response = await (server as any).handleGetLoadBalancerHealth({ id: 'lb-rule-123' });

        expect(testFramework.mockClient.getLoadBalancerHealth).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'lb-rule-123' })
        );
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when load balancer ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleGetLoadBalancerHealth({}),
          'Load balancer ID is required'
        );
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle port conflicts in load balancer rules', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Public port 80 is already in use by another load balancer rule'
      );
      testFramework.mockClient.createLoadBalancerRule.mockRejectedValue(error);

      const params = {
        algorithm: 'roundrobin',
        name: 'conflicting-lb-rule',
        privateport: '80',
        publicipid: 'ip-123',
        publicport: '80'
      };

      await testFramework.expectError(
        () => (server as any).handleCreateLoadBalancerRule(params),
        'already in use'
      );
    });

    it('should handle SSL certificate format errors', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Invalid SSL certificate format'
      );
      testFramework.mockClient.uploadSslCert.mockRejectedValue(error);

      const params = {
        certificate: 'invalid-certificate-format',
        privatekey: '-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----',
        name: 'invalid-ssl-cert'
      };

      await testFramework.expectError(
        () => (server as any).handleUploadSslCert(params),
        'Invalid SSL certificate'
      );
    });

    it('should handle load balancer rule with no VMs', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Load balancer rule has no virtual machines assigned'
      );
      testFramework.mockClient.deleteLoadBalancerRule.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleDeleteLoadBalancerRule({ id: 'lb-rule-no-vms' }),
        'no virtual machines assigned'
      );
    });

    it('should handle health check policy conflicts', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Health check policy already exists for this load balancer rule'
      );
      testFramework.mockClient.createLbHealthCheckPolicy.mockRejectedValue(error);

      const params = {
        lbruleid: 'lb-rule-123',
        pingpath: '/health',
        intervaltime: 5,
        responsetimeout: 2
      };

      await testFramework.expectError(
        () => (server as any).handleCreateLbHealthCheckPolicy(params),
        'already exists'
      );
    });

    it('should handle VM not found errors when assigning to load balancer', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Virtual machine vm-nonexistent not found'
      );
      testFramework.mockClient.assignToLoadBalancerRule.mockRejectedValue(error);

      const params = {
        id: 'lb-rule-123',
        virtualmachineids: 'vm-nonexistent'
      };

      await testFramework.expectError(
        () => (server as any).handleAssignToLoadBalancerRule(params),
        'not found'
      );
    });

    it('should handle permission errors for load balancer operations', async () => {
      const error = testFramework.createErrorResponse(
        401,
        'Access denied to load balancer resource'
      );
      testFramework.mockClient.updateLoadBalancerRule.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleUpdateLoadBalancerRule({ id: 'lb-rule-restricted' }),
        'Access denied'
      );
    });

    it('should handle SSL certificate in use deletion attempts', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Cannot delete SSL certificate that is assigned to load balancer rules'
      );
      testFramework.mockClient.deleteSslCert.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleDeleteSslCert({ id: 'ssl-cert-in-use' }),
        'Cannot delete SSL certificate'
      );
    });
  });
});