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

describe('Account Management - Comprehensive Test Suite', () => {
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

  describe('Account Operations', () => {
    describe('create_account', () => {
      it('should create account successfully with required parameters', async () => {
        const mockResponse = testFramework.createAsyncJobResponse('create-account-job-123');
        testFramework.mockClient.createAccount.mockResolvedValue(mockResponse);

        const params = {
          accounttype: 2,
          email: 'test@example.com',
          firstname: 'Test',
          lastname: 'User',
          password: 'securePassword123',
          username: 'testuser'
        };

        const response = await (server as any).handleCreateAccount(params);

        expect(testFramework.mockClient.createAccount).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response, 'Account creation');
      });

      it('should create account with optional parameters', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createAccount.mockResolvedValue(mockResponse);

        const params = {
          accounttype: 2,
          email: 'test@example.com',
          firstname: 'Test',
          lastname: 'User',
          password: 'securePassword123',
          username: 'testuser',
          account: 'test-account',
          domainid: 'domain-123',
          timezone: 'UTC',
          networkdomain: 'example.com'
        };

        const response = await (server as any).handleCreateAccount(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when username is missing', async () => {
        const params = {
          accounttype: 2,
          email: 'test@example.com',
          firstname: 'Test',
          lastname: 'User',
          password: 'securePassword123'
        };

        await testFramework.expectError(
          () => (server as any).handleCreateAccount(params),
          'Missing required parameter: username'
        );
      });

      it('should fail when email is missing', async () => {
        const params = {
          accounttype: 2,
          firstname: 'Test',
          lastname: 'User',
          password: 'securePassword123',
          username: 'testuser'
        };

        await testFramework.expectError(
          () => (server as any).handleCreateAccount(params),
          'Missing required parameter: email'
        );
      });

      it('should fail when password is missing', async () => {
        const params = {
          accounttype: 2,
          email: 'test@example.com',
          firstname: 'Test',
          lastname: 'User',
          username: 'testuser'
        };

        await testFramework.expectError(
          () => (server as any).handleCreateAccount(params),
          'Missing required parameter: password'
        );
      });
    });

    describe('list_accounts', () => {
      it('should list accounts successfully', async () => {
        const response = await (server as any).handleListAccounts({});

        expect(testFramework.mockClient.listAccounts).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list accounts with filtering parameters', async () => {
        const params = {
          accounttype: 2,
          state: 'enabled',
          domainid: 'domain-123',
          keyword: 'test-account'
        };

        const response = await (server as any).handleListAccounts(params);

        expect(testFramework.mockClient.listAccounts).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('update_account', () => {
      it('should update account successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.updateAccount.mockResolvedValue(mockResponse);

        const params = {
          id: 'account-123',
          account: 'updated-account-name',
          domainid: 'domain-123'
        };

        const response = await (server as any).handleUpdateAccount(params);

        expect(testFramework.mockClient.updateAccount).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Account update');
      });

      it('should fail when account ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleUpdateAccount({ account: 'updated-name' }),
          'Account ID is required'
        );
      });
    });

    describe('delete_account', () => {
      it('should delete account successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.deleteAccount.mockResolvedValue(mockResponse);

        const params = { id: 'account-123' };
        const response = await (server as any).handleDeleteAccount(params);

        expect(testFramework.mockClient.deleteAccount).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Account deletion');
      });

      it('should fail when account ID is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleDeleteAccount({}),
          'Account ID is required'
        );
      });
    });

    describe('enable_account', () => {
      it('should enable account successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.enableAccount.mockResolvedValue(mockResponse);

        const params = { account: 'test-account', domainid: 'domain-123' };
        const response = await (server as any).handleEnableAccount(params);

        expect(testFramework.mockClient.enableAccount).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Account enable');
      });
    });

    describe('disable_account', () => {
      it('should disable account successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.disableAccount.mockResolvedValue(mockResponse);

        const params = { account: 'test-account', domainid: 'domain-123', lock: false };
        const response = await (server as any).handleDisableAccount(params);

        expect(testFramework.mockClient.disableAccount).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Account disable');
      });
    });

    describe('lock_account', () => {
      it('should lock account successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.lockAccount.mockResolvedValue(mockResponse);

        const params = { account: 'test-account', domainid: 'domain-123' };
        const response = await (server as any).handleLockAccount(params);

        expect(testFramework.mockClient.lockAccount).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Account lock');
      });
    });
  });

  describe('Domain Operations', () => {
    describe('create_domain', () => {
      it('should create domain successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createDomain.mockResolvedValue(mockResponse);

        const params = {
          name: 'test-domain'
        };

        const response = await (server as any).handleCreateDomain(params);

        expect(testFramework.mockClient.createDomain).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Domain creation');
      });

      it('should create domain with parent domain', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createDomain.mockResolvedValue(mockResponse);

        const params = {
          name: 'subdomain',
          parentdomainid: 'parent-domain-123'
        };

        const response = await (server as any).handleCreateDomain(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when domain name is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleCreateDomain({}),
          'Domain name is required'
        );
      });
    });

    describe('list_domains', () => {
      it('should list domains successfully', async () => {
        const response = await (server as any).handleListDomains({});

        expect(testFramework.mockClient.listDomains).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list domains with filtering', async () => {
        const params = {
          level: 1,
          name: 'test-domain',
          state: 'Active'
        };

        const response = await (server as any).handleListDomains(params);

        expect(testFramework.mockClient.listDomains).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('update_domain', () => {
      it('should update domain successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.updateDomain.mockResolvedValue(mockResponse);

        const params = {
          id: 'domain-123',
          name: 'updated-domain-name'
        };

        const response = await (server as any).handleUpdateDomain(params);

        expect(testFramework.mockClient.updateDomain).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Domain update');
      });
    });

    describe('delete_domain', () => {
      it('should delete domain successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.deleteDomain.mockResolvedValue(mockResponse);

        const params = { id: 'domain-123' };
        const response = await (server as any).handleDeleteDomain(params);

        expect(testFramework.mockClient.deleteDomain).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Domain deletion');
      });

      it('should delete domain with cleanup option', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.deleteDomain.mockResolvedValue(mockResponse);

        const params = { id: 'domain-123', cleanup: true };
        const response = await (server as any).handleDeleteDomain(params);
        testFramework.expectSuccessResponse(response);
      });
    });
  });

  describe('User Operations', () => {
    describe('create_user', () => {
      it('should create user successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createUser.mockResolvedValue(mockResponse);

        const params = {
          account: 'test-account',
          email: 'user@example.com',
          firstname: 'John',
          lastname: 'Doe',
          password: 'securePassword123',
          username: 'johndoe'
        };

        const response = await (server as any).handleCreateUser(params);

        expect(testFramework.mockClient.createUser).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'User creation');
      });

      it('should create user with optional parameters', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createUser.mockResolvedValue(mockResponse);

        const params = {
          account: 'test-account',
          email: 'user@example.com',
          firstname: 'John',
          lastname: 'Doe',
          password: 'securePassword123',
          username: 'johndoe',
          domainid: 'domain-123',
          timezone: 'UTC'
        };

        const response = await (server as any).handleCreateUser(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when required parameters are missing', async () => {
        const params = {
          email: 'user@example.com',
          firstname: 'John',
          lastname: 'Doe',
          password: 'securePassword123'
        };

        await testFramework.expectError(
          () => (server as any).handleCreateUser(params),
          'Missing required parameter'
        );
      });
    });

    describe('list_users', () => {
      it('should list users successfully', async () => {
        const response = await (server as any).handleListUsers({});

        expect(testFramework.mockClient.listUsers).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list users with filtering', async () => {
        const params = {
          account: 'test-account',
          domainid: 'domain-123',
          state: 'enabled'
        };

        const response = await (server as any).handleListUsers(params);

        expect(testFramework.mockClient.listUsers).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('update_user', () => {
      it('should update user successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.updateUser.mockResolvedValue(mockResponse);

        const params = {
          id: 'user-123',
          firstname: 'UpdatedFirstName',
          lastname: 'UpdatedLastName',
          email: 'updated@example.com'
        };

        const response = await (server as any).handleUpdateUser(params);

        expect(testFramework.mockClient.updateUser).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'User update');
      });
    });

    describe('delete_user', () => {
      it('should delete user successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.deleteUser.mockResolvedValue(mockResponse);

        const params = { id: 'user-123' };
        const response = await (server as any).handleDeleteUser(params);

        expect(testFramework.mockClient.deleteUser).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'User deletion');
      });
    });

    describe('enable_user', () => {
      it('should enable user successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.enableUser.mockResolvedValue(mockResponse);

        const params = { id: 'user-123' };
        const response = await (server as any).handleEnableUser(params);

        expect(testFramework.mockClient.enableUser).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'User enable');
      });
    });

    describe('disable_user', () => {
      it('should disable user successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.disableUser.mockResolvedValue(mockResponse);

        const params = { id: 'user-123' };
        const response = await (server as any).handleDisableUser(params);

        expect(testFramework.mockClient.disableUser).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'User disable');
      });
    });

    describe('lock_user', () => {
      it('should lock user successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.lockUser.mockResolvedValue(mockResponse);

        const params = { id: 'user-123' };
        const response = await (server as any).handleLockUser(params);

        expect(testFramework.mockClient.lockUser).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'User lock');
      });
    });
  });

  describe('Role Operations', () => {
    describe('create_role', () => {
      it('should create role successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createRole.mockResolvedValue(mockResponse);

        const params = {
          name: 'test-role',
          type: 'User'
        };

        const response = await (server as any).handleCreateRole(params);

        expect(testFramework.mockClient.createRole).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Role creation');
      });

      it('should create role with description', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createRole.mockResolvedValue(mockResponse);

        const params = {
          name: 'test-role',
          type: 'User',
          description: 'Test role description'
        };

        const response = await (server as any).handleCreateRole(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when role name is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleCreateRole({ type: 'User' }),
          'Role name is required'
        );
      });
    });

    describe('list_roles', () => {
      it('should list roles successfully', async () => {
        const response = await (server as any).handleListRoles({});

        expect(testFramework.mockClient.listRoles).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list roles with filtering', async () => {
        const params = {
          type: 'User',
          name: 'test-role'
        };

        const response = await (server as any).handleListRoles(params);

        expect(testFramework.mockClient.listRoles).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('update_role', () => {
      it('should update role successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.updateRole.mockResolvedValue(mockResponse);

        const params = {
          id: 'role-123',
          name: 'updated-role-name',
          description: 'Updated role description'
        };

        const response = await (server as any).handleUpdateRole(params);

        expect(testFramework.mockClient.updateRole).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Role update');
      });
    });

    describe('delete_role', () => {
      it('should delete role successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.deleteRole.mockResolvedValue(mockResponse);

        const params = { id: 'role-123' };
        const response = await (server as any).handleDeleteRole(params);

        expect(testFramework.mockClient.deleteRole).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Role deletion');
      });
    });
  });

  describe('Project Operations', () => {
    describe('create_project', () => {
      it('should create project successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createProject.mockResolvedValue(mockResponse);

        const params = {
          displaytext: 'Test Project',
          name: 'test-project'
        };

        const response = await (server as any).handleCreateProject(params);

        expect(testFramework.mockClient.createProject).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Project creation');
      });

      it('should create project with optional parameters', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.createProject.mockResolvedValue(mockResponse);

        const params = {
          displaytext: 'Test Project',
          name: 'test-project',
          account: 'test-account',
          domainid: 'domain-123'
        };

        const response = await (server as any).handleCreateProject(params);
        testFramework.expectSuccessResponse(response);
      });

      it('should fail when project name is missing', async () => {
        await testFramework.expectError(
          () => (server as any).handleCreateProject({ displaytext: 'Test Project' }),
          'Project name is required'
        );
      });
    });

    describe('list_projects', () => {
      it('should list projects successfully', async () => {
        const response = await (server as any).handleListProjects({});

        expect(testFramework.mockClient.listProjects).toHaveBeenCalled();
        testFramework.expectSuccessResponse(response);
      });

      it('should list projects with filtering', async () => {
        const params = {
          account: 'test-account',
          state: 'Active',
          keyword: 'web-project'
        };

        const response = await (server as any).handleListProjects(params);

        expect(testFramework.mockClient.listProjects).toHaveBeenCalledWith(
          expect.objectContaining(params)
        );
        testFramework.expectSuccessResponse(response);
      });
    });

    describe('update_project', () => {
      it('should update project successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.updateProject.mockResolvedValue(mockResponse);

        const params = {
          id: 'project-123',
          displaytext: 'Updated Project Description'
        };

        const response = await (server as any).handleUpdateProject(params);

        expect(testFramework.mockClient.updateProject).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Project update');
      });
    });

    describe('delete_project', () => {
      it('should delete project successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.deleteProject.mockResolvedValue(mockResponse);

        const params = { id: 'project-123' };
        const response = await (server as any).handleDeleteProject(params);

        expect(testFramework.mockClient.deleteProject).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Project deletion');
      });
    });

    describe('suspend_project', () => {
      it('should suspend project successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.suspendProject.mockResolvedValue(mockResponse);

        const params = { id: 'project-123' };
        const response = await (server as any).handleSuspendProject(params);

        expect(testFramework.mockClient.suspendProject).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Project suspension');
      });
    });

    describe('activate_project', () => {
      it('should activate project successfully', async () => {
        const mockResponse = testFramework.createAsyncJobResponse();
        testFramework.mockClient.activateProject.mockResolvedValue(mockResponse);

        const params = { id: 'project-123' };
        const response = await (server as any).handleActivateProject(params);

        expect(testFramework.mockClient.activateProject).toHaveBeenCalledWith(params);
        testFramework.expectSuccessResponse(response, 'Project activation');
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle duplicate username errors', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Username already exists in the domain'
      );
      testFramework.mockClient.createAccount.mockRejectedValue(error);

      const params = {
        accounttype: 2,
        email: 'test@example.com',
        firstname: 'Test',
        lastname: 'User',
        password: 'securePassword123',
        username: 'existinguser'
      };

      await testFramework.expectError(
        () => (server as any).handleCreateAccount(params),
        'Username already exists'
      );
    });

    it('should handle domain hierarchy constraints', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Cannot delete domain that has child domains'
      );
      testFramework.mockClient.deleteDomain.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleDeleteDomain({ id: 'parent-domain' }),
        'Cannot delete domain'
      );
    });

    it('should handle account resource dependencies', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Cannot delete account that has active resources'
      );
      testFramework.mockClient.deleteAccount.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleDeleteAccount({ id: 'account-with-resources' }),
        'Cannot delete account'
      );
    });

    it('should handle role permission conflicts', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Role is in use and cannot be deleted'
      );
      testFramework.mockClient.deleteRole.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleDeleteRole({ id: 'role-in-use' }),
        'Role is in use'
      );
    });

    it('should handle project membership limits', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Maximum number of projects reached for account'
      );
      testFramework.mockClient.createProject.mockRejectedValue(error);

      const params = {
        displaytext: 'Limit Test Project',
        name: 'limit-project'
      };

      await testFramework.expectError(
        () => (server as any).handleCreateProject(params),
        'Maximum number of projects'
      );
    });

    it('should handle permission errors for account operations', async () => {
      const error = testFramework.createErrorResponse(
        401,
        'Access denied to account resource'
      );
      testFramework.mockClient.updateAccount.mockRejectedValue(error);

      await testFramework.expectError(
        () => (server as any).handleUpdateAccount({ id: 'restricted-account' }),
        'Access denied'
      );
    });

    it('should handle invalid email format', async () => {
      const error = testFramework.createErrorResponse(
        400,
        'Invalid email address format'
      );
      testFramework.mockClient.createUser.mockRejectedValue(error);

      const params = {
        account: 'test-account',
        email: 'invalid-email',
        firstname: 'Test',
        lastname: 'User',
        password: 'securePassword123',
        username: 'testuser'
      };

      await testFramework.expectError(
        () => (server as any).handleCreateUser(params),
        'Invalid email address'
      );
    });
  });
});