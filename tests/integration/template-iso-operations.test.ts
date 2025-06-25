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

describe('Template and ISO Operations - Comprehensive Test Suite', () => {
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

  describe('Template Operations', () => {
    describe('create_template', () => {
      it('should create template successfully with required parameters', async () => {
        const mockResponse = testFramework.createAsyncJobResponse('create-template-job-123');
        testFramework.mockClient.createTemplate.mockResolvedValue(mockResponse);

        const params = {
          displaytext: 'Test Template',
          name: 'test-template',
          ostypeid: 'os-type-123',
          volumeid: 'volume-123'
        };

        const response = await (server as any).handleCreateTemplate(params);

        expect(testFramework.mockClient.createTemplate).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response, 'Template creation');
      });

      it('should create template with optional parameters', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createTemplate.mockResolvedValue(mockResponse);

        const params = {
          displaytext: 'Test Template with Options',
          name: 'test-template-advanced',
          ostypeid: 'os-type-123',
          volumeid: 'volume-123',
          ispublic: true,
          isfeatured: false,
          passwordenabled: true,
          requireshvm: true,
          bits: 64,
          url: 'https://example.com/template.ova',
          hypervisor: 'VMware'
        };

        const response = await (server as any).handleCreateTemplate(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when name is missing', async () => {
        const params = {
          displaytext: 'Test Template',
          ostypeid: 'os-type-123',
          volumeid: 'volume-123'
        };

        await testFramework.expectError(
          () => (server as any).handleCreateTemplate(params),
          'Missing required parameter: name'
        );
      });

      it('should fail when display text is missing', async () => {
        const params = {
          name: 'test-template',
          ostypeid: 'os-type-123',
          volumeid: 'volume-123'
        };

        await testFramework.expectError(
          () => (server as any).handleCreateTemplate(params),
          'Missing required parameter: displaytext'
        );
      });

      it('should fail when OS type ID is missing', async () => {
        const params = {
          displaytext: 'Test Template',
          name: 'test-template',
          volumeid: 'volume-123'
        };

        await testFramework.expectError(
          () => (server as any).handleCreateTemplate(params),
          'Missing required parameter: ostypeid'
        );
      });
    });

    describe('list_templates', () => {
      it('should list templates successfully', async () => {
        const response = await (server as any).handleListTemplates({ templatefilter: 'self' });

        expect(testFramework.mockClient.listTemplates).toHaveBeenCalledWith(
          expect.objectContaining({ templatefilter: 'self' })
        );
        testFramework.expectSuccessResponse(response);
      });

      it('should list templates with filtering parameters', async () => {
        const params = {
          templatefilter: 'featured',
          account: 'test-account',
          zoneid: 'zone-123',
          hypervisor: 'VMware',
          keyword: 'ubuntu'
        };

        const response = await (server as any).handleListTemplates(params);

        expect(testFramework.mockClient.listTemplates).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when template filter is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleListTemplates({}),
          'Template filter is required'
        );
      });
    });

    describe('register_template', () => {
      it('should register template successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.registerTemplate.mockResolvedValue(mockResponse);

        const params = {
          displaytext: 'Registered Template',
          format: 'VHD',
          hypervisor: 'VMware',
          name: 'registered-template',
          ostypeid: 'os-type-123',
          url: 'https://example.com/template.vhd',
          zoneid: 'zone-123'
        };

        const response = await (server as any).handleRegisterTemplate(params);

        expect(testFramework.mockClient.registerTemplate).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Template registration');
      });

      it('should register template with cross-zone support', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.registerTemplate.mockResolvedValue(mockResponse);

        const params = {
          displaytext: 'Cross-Zone Template',
          format: 'OVA',
          hypervisor: 'VMware',
          name: 'cross-zone-template',
          ostypeid: 'os-type-123',
          url: 'https://example.com/template.ova',
          zoneid: '-1',
          isextractable: true,
          ispublic: true
        };

        const response = await (server as any).handleRegisterTemplate(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when URL is missing', async () => {
        const params = {
          displaytext: 'Registered Template',
          format: 'VHD',
          hypervisor: 'VMware',
          name: 'registered-template',
          ostypeid: 'os-type-123',
          zoneid: 'zone-123'
        };

        await testFramework.expectError(
          () => (server as any).handleRegisterTemplate(params),
          'Missing required parameter: url'
        );
      });

      it('should fail when format is missing', async () => {
        const params = {
          displaytext: 'Registered Template',
          hypervisor: 'VMware',
          name: 'registered-template',
          ostypeid: 'os-type-123',
          url: 'https://example.com/template.vhd',
          zoneid: 'zone-123'
        };

        await testFramework.expectError(
          () => (server as any).handleRegisterTemplate(params),
          'Missing required parameter: format'
        );
      });

      it('should fail when hypervisor is missing', async () => {
        const params = {
          displaytext: 'Registered Template',
          format: 'VHD',
          name: 'registered-template',
          ostypeid: 'os-type-123',
          url: 'https://example.com/template.vhd',
          zoneid: 'zone-123'
        };

        await testFramework.expectError(
          () => (server as any).handleRegisterTemplate(params),
          'Missing required parameter: hypervisor'
        );
      });
    });

    describe('update_template', () => {
      it('should update template successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.updateTemplate.mockResolvedValue(mockResponse);

        const params = {
          id: 'template-123',
          displaytext: 'Updated Template Description',
          name: 'updated-template-name',
          ostypeid: 'new-os-type-456'
        };

        const response = await (server as any).handleUpdateTemplate(params);

        expect(testFramework.mockClient.updateTemplate).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Template update');
      });

      it('should update template permissions', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.updateTemplate.mockResolvedValue(mockResponse);

        const params = {
          id: 'template-123',
          ispublic: false,
          isfeatured: true,
          isextractable: false
        };

        const response = await (server as any).handleUpdateTemplate(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when template ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleUpdateTemplate({ name: 'updated-name' }),
          'Template ID is required'
        );
      });
    });

    describe('copy_template', () => {
      it('should copy template successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.copyTemplate.mockResolvedValue(mockResponse);

        const params = {
          id: 'template-123',
          destzoneid: 'dest-zone-456',
          sourcezoneid: 'source-zone-123'
        };

        const response = await (server as any).handleCopyTemplate(params);

        expect(testFramework.mockClient.copyTemplate).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Template copy');
      });

      it('should fail when template ID is missing', async () => {
        const params = {
          destzoneid: 'dest-zone-456',
          sourcezoneid: 'source-zone-123'
        };

        await testFramework.expectError(
          () => (server as any).handleCopyTemplate(params),
          'Template ID is required'
        );
      });

      it('should fail when destination zone ID is missing', async () => {
        const params = {
          id: 'template-123',
          sourcezoneid: 'source-zone-123'
        };

        await testFramework.expectError(
          () => (server as any).handleCopyTemplate(params),
          'Destination zone ID is required'
        );
      });
    });

    describe('extract_template', () => {
      it('should extract template successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.extractTemplate.mockResolvedValue(mockResponse);

        const params = {
          id: 'template-123',
          mode: 'HTTP_DOWNLOAD',
          zoneid: 'zone-123'
        };

        const response = await (server as any).handleExtractTemplate(params);

        expect(testFramework.mockClient.extractTemplate).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Template extraction');
      });

      it('should extract template to FTP', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.extractTemplate.mockResolvedValue(mockResponse);

        const params = {
          id: 'template-123',
          mode: 'FTP_UPLOAD',
          zoneid: 'zone-123',
          url: 'ftp://ftp.example.com/templates/'
        };

        const response = await (server as any).handleExtractTemplate(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when template ID is missing', async () => {
        const params = {
          mode: 'HTTP_DOWNLOAD',
          zoneid: 'zone-123'
        };

        await testFramework.expectError(
          () => (server as any).handleExtractTemplate(params),
          'Template ID is required'
        );
      });

      it('should fail when mode is missing', async () => {
        const params = {
          id: 'template-123',
          zoneid: 'zone-123'
        };

        await testFramework.expectError(
          () => (server as any).handleExtractTemplate(params),
          'Mode is required'
        );
      });
    });

    describe('delete_template', () => {
      it('should delete template successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.deleteTemplate.mockResolvedValue(mockResponse);

        const params = { id: 'template-123' };
        const response = await (server as any).handleDeleteTemplate(params);

        expect(testFramework.mockClient.deleteTemplate).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Template deletion');
      });

      it('should delete template from specific zone', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.deleteTemplate.mockResolvedValue(mockResponse);

        const params = {
          id: 'template-123',
          zoneid: 'zone-456'
        };

        const response = await (server as any).handleDeleteTemplate(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when template ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleDeleteTemplate({}),
          'Template ID is required'
        );
      });
    });

    describe('create_template_from_vm', () => {
      it('should create template from VM successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createTemplateFromVm.mockResolvedValue(mockResponse);

        const params = {
          displaytext: 'Template from VM',
          name: 'vm-template',
          ostypeid: 'os-type-123',
          virtualmachineid: 'vm-123'
        };

        const response = await (server as any).handleCreateTemplateFromVm(params);

        expect(testFramework.mockClient.createTemplateFromVm).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Template creation from VM');
      });

      it('should create template from VM with snapshot', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createTemplateFromVm.mockResolvedValue(mockResponse);

        const params = {
          displaytext: 'Template from VM Snapshot',
          name: 'vm-snapshot-template',
          ostypeid: 'os-type-123',
          virtualmachineid: 'vm-123',
          snapshotid: 'snapshot-456',
          volumeid: 'volume-789'
        };

        const response = await (server as any).handleCreateTemplateFromVm(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when VM ID is missing', async () => {
        const params = {
          displaytext: 'Template from VM',
          name: 'vm-template',
          ostypeid: 'os-type-123'
        };

        await testFramework.expectError(
          () => (server as any).handleCreateTemplateFromVm(params),
          'Virtual machine ID is required'
        );
      });
    });
  });

  describe('ISO Operations', () => {
    describe('list_isos', () => {
      it('should list ISOs successfully', async () => {
        const response = await (server as any).handleListIsos({ isofilter: 'self' });

        expect(testFramework.mockClient.listIsos).toHaveBeenCalledWith(
          expect.objectContaining({ isofilter: 'self' })
        );
        testFramework.expectSuccessResponse(response);
      });

      it('should list ISOs with filtering parameters', async () => {
        const params = {
          isofilter: 'featured',
          account: 'test-account',
          zoneid: 'zone-123',
          bootable: true,
          keyword: 'centos'
        };

        const response = await (server as any).handleListIsos(params);

        expect(testFramework.mockClient.listIsos).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when ISO filter is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleListIsos({}),
          'ISO filter is required'
        );
      });
    });

    describe('register_iso', () => {
      it('should register ISO successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.registerIso.mockResolvedValue(mockResponse);

        const params = {
          displaytext: 'CentOS 7 ISO',
          name: 'centos-7-iso',
          url: 'https://example.com/CentOS-7.iso',
          zoneid: 'zone-123'
        };

        const response = await (server as any).handleRegisterIso(params);

        expect(testFramework.mockClient.registerIso).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'ISO registration');
      });

      it('should register bootable ISO', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.registerIso.mockResolvedValue(mockResponse);

        const params = {
          displaytext: 'Ubuntu 20.04 Bootable ISO',
          name: 'ubuntu-20.04-iso',
          url: 'https://example.com/ubuntu-20.04.iso',
          zoneid: 'zone-123',
          bootable: true,
          ostypeid: 'os-type-ubuntu',
          ispublic: false
        };

        const response = await (server as any).handleRegisterIso(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when name is missing', async () => {
        const params = {
          displaytext: 'CentOS 7 ISO',
          url: 'https://example.com/CentOS-7.iso',
          zoneid: 'zone-123'
        };

        await testFramework.expectError(
          () => (server as any).handleRegisterIso(params),
          'Missing required parameter: name'
        );
      });

      it('should fail when URL is missing', async () => {
        const params = {
          displaytext: 'CentOS 7 ISO',
          name: 'centos-7-iso',
          zoneid: 'zone-123'
        };

        await testFramework.expectError(
          () => (server as any).handleRegisterIso(params),
          'Missing required parameter: url'
        );
      });

      it('should fail when zone ID is missing', async () => {
        const params = {
          displaytext: 'CentOS 7 ISO',
          name: 'centos-7-iso',
          url: 'https://example.com/CentOS-7.iso'
        };

        await testFramework.expectError(
          () => (server as any).handleRegisterIso(params),
          'Missing required parameter: zoneid'
        );
      });
    });

    describe('update_iso', () => {
      it('should update ISO successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.updateIso.mockResolvedValue(mockResponse);

        const params = {
          id: 'iso-123',
          displaytext: 'Updated ISO Description',
          name: 'updated-iso-name',
          ostypeid: 'new-os-type-456'
        };

        const response = await (server as any).handleUpdateIso(params);

        expect(testFramework.mockClient.updateIso).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'ISO update');
      });

      it('should update ISO permissions', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.updateIso.mockResolvedValue(mockResponse);

        const params = {
          id: 'iso-123',
          ispublic: true,
          bootable: false
        };

        const response = await (server as any).handleUpdateIso(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when ISO ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleUpdateIso({ name: 'updated-name' }),
          'ISO ID is required'
        );
      });
    });

    describe('copy_iso', () => {
      it('should copy ISO successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.copyIso.mockResolvedValue(mockResponse);

        const params = {
          id: 'iso-123',
          destzoneid: 'dest-zone-456',
          sourcezoneid: 'source-zone-123'
        };

        const response = await (server as any).handleCopyIso(params);

        expect(testFramework.mockClient.copyIso).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'ISO copy');
      });

      it('should fail when ISO ID is missing', async () => {
        const params = {
          destzoneid: 'dest-zone-456',
          sourcezoneid: 'source-zone-123'
        };

        await testFramework.expectError(
          () => (server as any).handleCopyIso(params),
          'ISO ID is required'
        );
      });
    });

    describe('extract_iso', () => {
      it('should extract ISO successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.extractIso.mockResolvedValue(mockResponse);

        const params = {
          id: 'iso-123',
          mode: 'HTTP_DOWNLOAD',
          zoneid: 'zone-123'
        };

        const response = await (server as any).handleExtractIso(params);

        expect(testFramework.mockClient.extractIso).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'ISO extraction');
      });

      it('should fail when ISO ID is missing', async () => {
        const params = {
          mode: 'HTTP_DOWNLOAD',
          zoneid: 'zone-123'
        };

        await testFramework.expectError(
          () => (server as any).handleExtractIso(params),
          'ISO ID is required'
        );
      });
    });

    describe('attach_iso', () => {
      it('should attach ISO to VM successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.attachIso.mockResolvedValue(mockResponse);

        const params = {
          id: 'iso-123',
          virtualmachineid: 'vm-456'
        };

        const response = await (server as any).handleAttachIso(params);

        expect(testFramework.mockClient.attachIso).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'ISO attachment');
      });

      it('should fail when ISO ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleAttachIso({ virtualmachineid: 'vm-456' }),
          'ISO ID is required'
        );
      });

      it('should fail when VM ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleAttachIso({ id: 'iso-123' }),
          'Virtual machine ID is required'
        );
      });
    });

    describe('detach_iso', () => {
      it('should detach ISO from VM successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.detachIso.mockResolvedValue(mockResponse);

        const params = { virtualmachineid: 'vm-456' };
        const response = await (server as any).handleDetachIso(params);

        expect(testFramework.mockClient.detachIso).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'ISO detachment');
      });

      it('should fail when VM ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleDetachIso({}),
          'Virtual machine ID is required'
        );
      });
    });

    describe('delete_iso', () => {
      it('should delete ISO successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.deleteIso.mockResolvedValue(mockResponse);

        const params = { id: 'iso-123' };
        const response = await (server as any).handleDeleteIso(params);

        expect(testFramework.mockClient.deleteIso).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'ISO deletion');
      });

      it('should delete ISO from specific zone', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.deleteIso.mockResolvedValue(mockResponse);

        const params = {
          id: 'iso-123',
          zoneid: 'zone-456'
        };

        const response = await (server as any).handleDeleteIso(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when ISO ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleDeleteIso({}),
          'ISO ID is required'
        );
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle template name conflicts', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Template with this name already exists'
      );
      testFramework.mockClient.createTemplate.mockRejectedValue(error);

      const params = {
        displaytext: 'Duplicate Template',
        name: 'existing-template',
        ostypeid: 'os-type-123',
        volumeid: 'volume-123'
      };

      await testFramework.expectError(
        () => (server as any).handleCreateTemplate(params),
        'already exists'
      );
    });

    it('should handle invalid template URL format', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Invalid template URL format'
      );
      testFramework.mockClient.registerTemplate.mockRejectedValue(error);

      const params = {
        displaytext: 'Invalid URL Template',
        format: 'VHD',
        hypervisor: 'VMware',
        name: 'invalid-url-template',
        ostypeid: 'os-type-123',
        url: 'invalid-url-format',
        zoneid: 'zone-123'
      };

      await testFramework.expectError(
        () => (server as any).handleRegisterTemplate(params),
        'Invalid template URL'
      );
    });

    it('should handle template in use deletion attempts', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Cannot delete template that is being used by virtual machines'
      );
      testFramework.mockClient.deleteTemplate.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleDeleteTemplate({ id: 'template-in-use' }),
        'Cannot delete template'
      );
    });

    it('should handle template copy across incompatible zones', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Template cannot be copied to zone with different hypervisor'
      );
      testFramework.mockClient.copyTemplate.mockRejectedValue(error);

      const params = {
        id: 'template-123',
        destzoneid: 'incompatible-zone',
        sourcezoneid: 'source-zone-123'
      };

      await testFramework.expectError(
        () => (server as any).handleCopyTemplate(params),
        'different hypervisor'
      );
    });

    it('should handle ISO already attached to VM', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'ISO is already attached to the virtual machine'
      );
      testFramework.mockClient.attachIso.mockRejectedValue(error);

      const params = {
        id: 'iso-123',
        virtualmachineid: 'vm-with-iso'
      };

      await testFramework.expectError(
        () => (server as any).handleAttachIso(params),
        'already attached'
      );
    });

    it('should handle VM with no ISO attached during detach', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'No ISO is attached to this virtual machine'
      );
      testFramework.mockClient.detachIso.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleDetachIso({ virtualmachineid: 'vm-no-iso' }),
        'No ISO is attached'
      );
    });

    it('should handle insufficient storage for template creation', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Insufficient storage space for template creation'
      );
      testFramework.mockClient.createTemplate.mockRejectedValue(error);

      const params = {
        displaytext: 'Large Template',
        name: 'large-template',
        ostypeid: 'os-type-123',
        volumeid: 'large-volume'
      };

      await testFramework.expectError(
        () => (server as any).handleCreateTemplate(params),
        'Insufficient storage'
      );
    });

    it('should handle permission errors for template operations', async () => {
      const error = testFramework.createErrorResponse(
        401,
        'Access denied to template resource'
      );
      testFramework.mockClient.updateTemplate.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleUpdateTemplate({ id: 'template-restricted' }),
        'Access denied'
      );
    });

    it('should handle network timeout during template download', async () => {
      const timeoutError = new Error('Template download timeout');
      (timeoutError as any).code = 'ECONNABORTED';
      testFramework.mockClient.registerTemplate.mockRejectedValue(timeoutError);

      const params = {
        displaytext: 'Slow Download Template',
        format: 'VHD',
        hypervisor: 'VMware',
        name: 'slow-template',
        ostypeid: 'os-type-123',
        url: 'https://slow-server.com/template.vhd',
        zoneid: 'zone-123'
      };

      await testFramework.expectError(
        () => (server as any).handleRegisterTemplate(params),
        'Template download timeout'
      );
    });

    it('should handle template extraction to invalid destination', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Cannot extract template to specified location'
      );
      testFramework.mockClient.extractTemplate.mockRejectedValue(error);

      const params = {
        id: 'template-123',
        mode: 'FTP_UPLOAD',
        zoneid: 'zone-123',
        url: 'ftp://invalid-ftp-server.com/'
      };

      await testFramework.expectError(
        () => (server as any).handleExtractTemplate(params),
        'Cannot extract template'
      );
    });
  });
});