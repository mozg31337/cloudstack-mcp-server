import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { CloudStackAuth } from './auth.js';
import { CloudStackEnvironment, CloudStackResponse, CloudStackError } from './types.js';
import { Logger } from '../utils/logger.js';

export class CloudStackClient {
  private auth: CloudStackAuth;
  private environment: CloudStackEnvironment;
  private httpClient: AxiosInstance;

  constructor(environment: CloudStackEnvironment) {
    this.environment = environment;
    this.auth = new CloudStackAuth(environment.apiKey, environment.secretKey);
    
    this.httpClient = axios.create({
      timeout: environment.timeout || 30000,
      headers: {
        'User-Agent': 'CloudStack-MCP-Server/1.0.0',
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    this.setupInterceptors();
    Logger.info(`CloudStack client initialized for ${environment.name} (${this.auth.maskApiKey()})`);
  }

  private setupInterceptors(): void {
    this.httpClient.interceptors.request.use(
      (config) => {
        Logger.debug(`CloudStack API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        Logger.error('CloudStack API Request Error', error);
        return Promise.reject(error);
      }
    );

    this.httpClient.interceptors.response.use(
      (response) => {
        Logger.debug(`CloudStack API Response: ${response.status} ${response.statusText}`);
        return response;
      },
      (error) => {
        Logger.error('CloudStack API Response Error', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
        return Promise.reject(error);
      }
    );
  }

  public async makeRequest<T = any>(
    command: string, 
    params: Record<string, any> = {}
  ): Promise<T> {
    const requestParams = {
      command,
      ...params
    };

    const url = this.auth.buildAuthenticatedUrl(this.environment.apiUrl, requestParams);
    
    try {
      const response: AxiosResponse<CloudStackResponse<T>> = await this.httpClient.get(url);
      
      if (response.data && this.isErrorResponse(response.data)) {
        const error = response.data as unknown as CloudStackError;
        throw new Error(`CloudStack API Error (${error.errorcode}): ${error.errortext}`);
      }

      return this.extractResponseData<T>(command, response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error(`Request timeout after ${this.environment.timeout}ms`);
        }
        if (error.response?.status === 401) {
          throw new Error('Authentication failed - check your API credentials');
        }
        if (error.response?.status === 403) {
          throw new Error('Access denied - insufficient permissions');
        }
        if (error.response?.data) {
          const errorData = error.response.data as CloudStackError;
          throw new Error(`CloudStack API Error: ${errorData.errortext || error.message}`);
        }
      }
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('Unknown error occurred during CloudStack API request');
    }
  }

  private isErrorResponse(data: any): boolean {
    return data && typeof data === 'object' && 'errorcode' in data && 'errortext' in data;
  }

  private extractResponseData<T>(command: string, responseData: CloudStackResponse<T>): T {
    const commandKey = command.toLowerCase() + 'response';
    
    if (responseData[commandKey]) {
      return responseData[commandKey] as T;
    }

    const possibleKeys = Object.keys(responseData).filter(key => key.endsWith('response'));
    if (possibleKeys.length === 1 && possibleKeys[0]) {
      return responseData[possibleKeys[0]] as T;
    }

    Logger.warn(`Unexpected response structure for command: ${command}`, { 
      availableKeys: Object.keys(responseData) 
    });
    
    return responseData as unknown as T;
  }

  public async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest('listCapabilities');
      Logger.info('CloudStack connection test successful');
      return true;
    } catch (error) {
      Logger.error('CloudStack connection test failed', error);
      return false;
    }
  }

  public getEnvironmentInfo(): Omit<CloudStackEnvironment, 'apiKey' | 'secretKey'> {
    return {
      name: this.environment.name,
      apiUrl: this.environment.apiUrl,
      timeout: this.environment.timeout,
      retries: this.environment.retries
    };
  }

  public async listVirtualMachines(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listVirtualMachines', params);
  }

  public async listNetworks(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listNetworks', params);
  }

  public async listVolumes(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listVolumes', params);
  }

  public async listSnapshots(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listSnapshots', params);
  }

  public async listZones(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listZones', params);
  }

  public async listHosts(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listHosts', params);
  }

  public async listServiceOfferings(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listServiceOfferings', params);
  }

  public async listDiskOfferings(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listDiskOfferings', params);
  }

  public async listTemplates(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listTemplates', params);
  }

  // Template Management
  public async registerTemplate(params: Record<string, any>): Promise<any> {
    return this.makeRequest('registerTemplate', params);
  }

  public async extractTemplate(params: Record<string, any>): Promise<any> {
    return this.makeRequest('extractTemplate', params);
  }

  public async prepareTemplate(params: Record<string, any>): Promise<any> {
    return this.makeRequest('prepareTemplate', params);
  }

  public async updateTemplatePermissions(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateTemplatePermissions', params);
  }

  // ISO Management
  public async listIsos(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listIsos', params);
  }

  public async registerIso(params: Record<string, any>): Promise<any> {
    return this.makeRequest('registerIso', params);
  }

  public async updateIso(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateIso', params);
  }

  public async deleteIso(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteIso', params);
  }

  public async copyIso(params: Record<string, any>): Promise<any> {
    return this.makeRequest('copyIso', params);
  }

  public async extractIso(params: Record<string, any>): Promise<any> {
    return this.makeRequest('extractIso', params);
  }

  public async attachIso(params: Record<string, any>): Promise<any> {
    return this.makeRequest('attachIso', params);
  }

  public async detachIso(params: Record<string, any>): Promise<any> {
    return this.makeRequest('detachIso', params);
  }

  // VPC Management
  public async createVPC(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createVPC', params);
  }

  public async listVPCs(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listVPCs', params);
  }

  public async deleteVPC(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteVPC', params);
  }

  public async updateVPC(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateVPC', params);
  }

  public async restartVPC(params: Record<string, any>): Promise<any> {
    return this.makeRequest('restartVPC', params);
  }

  // Private Gateway Management
  public async createPrivateGateway(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createPrivateGateway', params);
  }

  public async listPrivateGateways(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listPrivateGateways', params);
  }

  public async deletePrivateGateway(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deletePrivateGateway', params);
  }

  // Static Route Management
  public async createStaticRoute(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createStaticRoute', params);
  }

  public async listStaticRoutes(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listStaticRoutes', params);
  }

  public async deleteStaticRoute(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteStaticRoute', params);
  }

  // VPN Services Management
  public async createVpnConnection(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createVpnConnection', params);
  }

  public async listVpnConnections(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listVpnConnections', params);
  }

  public async deleteVpnConnection(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteVpnConnection', params);
  }

  public async resetVpnConnection(params: Record<string, any>): Promise<any> {
    return this.makeRequest('resetVpnConnection', params);
  }

  public async createVpnGateway(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createVpnGateway', params);
  }

  public async listVpnGateways(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listVpnGateways', params);
  }

  public async deleteVpnGateway(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteVpnGateway', params);
  }

  public async createVpnCustomerGateway(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createVpnCustomerGateway', params);
  }

  public async listVpnCustomerGateways(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listVpnCustomerGateways', params);
  }

  public async deleteVpnCustomerGateway(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteVpnCustomerGateway', params);
  }

  public async createRemoteAccessVpn(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createRemoteAccessVpn', params);
  }

  public async listRemoteAccessVpns(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listRemoteAccessVpns', params);
  }

  public async deleteRemoteAccessVpn(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteRemoteAccessVpn', params);
  }

  public async addVpnUser(params: Record<string, any>): Promise<any> {
    return this.makeRequest('addVpnUser', params);
  }

  public async listVpnUsers(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listVpnUsers', params);
  }

  public async removeVpnUser(params: Record<string, any>): Promise<any> {
    return this.makeRequest('removeVpnUser', params);
  }

  // VPC Offerings Management
  public async createVpcOffering(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createVpcOffering', params);
  }

  public async listVpcOfferings(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listVpcOfferings', params);
  }

  public async updateVpcOffering(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateVpcOffering', params);
  }

  public async deleteVpcOffering(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteVpcOffering', params);
  }

  // Network ACL Lists Management
  public async createNetworkACLList(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createNetworkAclList', params);
  }

  public async listNetworkACLLists(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listNetworkAclLists', params);
  }

  public async deleteNetworkACLList(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteNetworkAclList', params);
  }

  public async replaceNetworkACLList(params: Record<string, any>): Promise<any> {
    return this.makeRequest('replaceNetworkAclList', params);
  }

  public async listSecurityGroups(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listSecurityGroups', params);
  }

  // Virtual Machine Management
  public async deployVirtualMachine(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deployVirtualMachine', params);
  }

  public async startVirtualMachine(params: Record<string, any>): Promise<any> {
    return this.makeRequest('startVirtualMachine', params);
  }

  public async stopVirtualMachine(params: Record<string, any>): Promise<any> {
    return this.makeRequest('stopVirtualMachine', params);
  }

  public async rebootVirtualMachine(params: Record<string, any>): Promise<any> {
    return this.makeRequest('rebootVirtualMachine', params);
  }

  public async destroyVirtualMachine(params: Record<string, any>): Promise<any> {
    return this.makeRequest('destroyVirtualMachine', params);
  }

  public async restoreVirtualMachine(params: Record<string, any>): Promise<any> {
    return this.makeRequest('restoreVirtualMachine', params);
  }

  public async updateVirtualMachine(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateVirtualMachine', params);
  }

  public async changeServiceForVirtualMachine(params: Record<string, any>): Promise<any> {
    return this.makeRequest('changeServiceForVirtualMachine', params);
  }

  // Volume Management
  public async createVolume(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createVolume', params);
  }

  public async attachVolume(params: Record<string, any>): Promise<any> {
    return this.makeRequest('attachVolume', params);
  }

  public async detachVolume(params: Record<string, any>): Promise<any> {
    return this.makeRequest('detachVolume', params);
  }

  public async deleteVolume(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteVolume', params);
  }

  public async resizeVolume(params: Record<string, any>): Promise<any> {
    return this.makeRequest('resizeVolume', params);
  }

  public async migrateVolume(params: Record<string, any>): Promise<any> {
    return this.makeRequest('migrateVolume', params);
  }

  // Snapshot Management
  public async createSnapshot(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createSnapshot', params);
  }

  public async deleteSnapshot(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteSnapshot', params);
  }

  public async createVolumeFromSnapshot(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createVolumeFromSnapshot', params);
  }

  public async revertSnapshot(params: Record<string, any>): Promise<any> {
    return this.makeRequest('revertSnapshot', params);
  }

  // Network Management
  public async createNetwork(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createNetwork', params);
  }

  public async deleteNetwork(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteNetwork', params);
  }

  public async updateNetwork(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateNetwork', params);
  }

  public async restartNetwork(params: Record<string, any>): Promise<any> {
    return this.makeRequest('restartNetwork', params);
  }

  // Security Group Management
  public async createSecurityGroup(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createSecurityGroup', params);
  }

  public async deleteSecurityGroup(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteSecurityGroup', params);
  }

  public async authorizeSecurityGroupIngress(params: Record<string, any>): Promise<any> {
    return this.makeRequest('authorizeSecurityGroupIngress', params);
  }

  public async authorizeSecurityGroupEgress(params: Record<string, any>): Promise<any> {
    return this.makeRequest('authorizeSecurityGroupEgress', params);
  }

  public async revokeSecurityGroupIngress(params: Record<string, any>): Promise<any> {
    return this.makeRequest('revokeSecurityGroupIngress', params);
  }

  public async revokeSecurityGroupEgress(params: Record<string, any>): Promise<any> {
    return this.makeRequest('revokeSecurityGroupEgress', params);
  }

  // Template Management
  public async createTemplate(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createTemplate', params);
  }

  public async deleteTemplate(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteTemplate', params);
  }

  public async updateTemplate(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateTemplate', params);
  }

  public async copyTemplate(params: Record<string, any>): Promise<any> {
    return this.makeRequest('copyTemplate', params);
  }

  // Load Balancer Management
  public async createLoadBalancerRule(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createLoadBalancerRule', params);
  }

  public async deleteLoadBalancerRule(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteLoadBalancerRule', params);
  }

  public async assignToLoadBalancerRule(params: Record<string, any>): Promise<any> {
    return this.makeRequest('assignToLoadBalancerRule', params);
  }

  public async removeFromLoadBalancerRule(params: Record<string, any>): Promise<any> {
    return this.makeRequest('removeFromLoadBalancerRule', params);
  }

  public async listLoadBalancerRules(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listLoadBalancerRules', params);
  }

  public async updateLoadBalancerRule(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateLoadBalancerRule', params);
  }

  // Load Balancer Health Check Policies
  public async createLBHealthCheckPolicy(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createLBHealthCheckPolicy', params);
  }

  public async deleteLBHealthCheckPolicy(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteLBHealthCheckPolicy', params);
  }

  public async listLBHealthCheckPolicies(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listLBHealthCheckPolicies', params);
  }

  // Load Balancer Stickiness Policies
  public async createLBStickinessPolicy(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createLBStickinessPolicy', params);
  }

  public async deleteLBStickinessPolicy(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteLBStickinessPolicy', params);
  }

  public async listLBStickinessPolicies(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listLBStickinessPolicies', params);
  }

  // SSL Certificate Management
  public async uploadSslCert(params: Record<string, any>): Promise<any> {
    return this.makeRequest('uploadSslCert', params);
  }

  public async deleteSslCert(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteSslCert', params);
  }

  public async listSslCerts(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listSslCerts', params);
  }

  public async assignCertToLoadBalancer(params: Record<string, any>): Promise<any> {
    return this.makeRequest('assignCertToLoadBalancer', params);
  }

  public async removeCertFromLoadBalancer(params: Record<string, any>): Promise<any> {
    return this.makeRequest('removeCertFromLoadBalancer', params);
  }

  // Application Load Balancer
  public async createApplicationLoadBalancer(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createApplicationLoadBalancer', params);
  }

  public async deleteApplicationLoadBalancer(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteApplicationLoadBalancer', params);
  }

  public async listApplicationLoadBalancers(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listApplicationLoadBalancers', params);
  }

  public async configureApplicationLoadBalancer(params: Record<string, any>): Promise<any> {
    return this.makeRequest('configureApplicationLoadBalancer', params);
  }

  // Firewall Rules Management
  public async createFirewallRule(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createFirewallRule', params);
  }

  public async deleteFirewallRule(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteFirewallRule', params);
  }

  public async listFirewallRules(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listFirewallRules', params);
  }

  public async updateFirewallRule(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateFirewallRule', params);
  }

  // Advanced Virtual Machine Management
  public async migrateVirtualMachine(params: Record<string, any>): Promise<any> {
    return this.makeRequest('migrateVirtualMachine', params);
  }

  public async scaleVirtualMachine(params: Record<string, any>): Promise<any> {
    return this.makeRequest('scaleVirtualMachine', params);
  }

  public async assignVirtualMachine(params: Record<string, any>): Promise<any> {
    return this.makeRequest('assignVirtualMachine', params);
  }

  public async recoverVirtualMachine(params: Record<string, any>): Promise<any> {
    return this.makeRequest('recoverVirtualMachine', params);
  }

  public async resetPasswordForVirtualMachine(params: Record<string, any>): Promise<any> {
    return this.makeRequest('resetPasswordForVirtualMachine', params);
  }

  public async getVMPassword(params: Record<string, any>): Promise<any> {
    return this.makeRequest('getVMPassword', params);
  }

  public async addNicToVirtualMachine(params: Record<string, any>): Promise<any> {
    return this.makeRequest('addNicToVirtualMachine', params);
  }

  public async removeNicFromVirtualMachine(params: Record<string, any>): Promise<any> {
    return this.makeRequest('removeNicFromVirtualMachine', params);
  }

  public async updateDefaultNicForVirtualMachine(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateDefaultNicForVirtualMachine', params);
  }

  public async addResourceDetail(params: Record<string, any>): Promise<any> {
    return this.makeRequest('addResourceDetail', params);
  }

  public async removeResourceDetail(params: Record<string, any>): Promise<any> {
    return this.makeRequest('removeResourceDetail', params);
  }

  public async listResourceDetails(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listResourceDetails', params);
  }

  public async expungeVirtualMachine(params: Record<string, any>): Promise<any> {
    return this.makeRequest('expungeVirtualMachine', params);
  }

  // Advanced Volume Management
  public async extractVolume(params: Record<string, any>): Promise<any> {
    return this.makeRequest('extractVolume', params);
  }

  public async uploadVolume(params: Record<string, any>): Promise<any> {
    return this.makeRequest('uploadVolume', params);
  }

  public async listVolumeMetrics(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listVolumeMetrics', params);
  }

  public async createVolumeOnFiler(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createVolumeOnFiler', params);
  }

  public async destroyVolumeOnFiler(params: Record<string, any>): Promise<any> {
    return this.makeRequest('destroyVolumeOnFiler', params);
  }

  // Network Management
  public async createNetworkOffering(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createNetworkOffering', params);
  }

  public async deleteNetworkOffering(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteNetworkOffering', params);
  }

  public async updateNetworkOffering(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateNetworkOffering', params);
  }

  public async listNetworkOfferings(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listNetworkOfferings', params);
  }

  // IP Address Management
  public async associateIpAddress(params: Record<string, any>): Promise<any> {
    return this.makeRequest('associateIpAddress', params);
  }

  public async disassociateIpAddress(params: Record<string, any>): Promise<any> {
    return this.makeRequest('disassociateIpAddress', params);
  }

  public async listPublicIpAddresses(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listPublicIpAddresses', params);
  }

  public async updateIpAddress(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateIpAddress', params);
  }

  // Static NAT Management
  public async enableStaticNat(params: Record<string, any>): Promise<any> {
    return this.makeRequest('enableStaticNat', params);
  }

  public async disableStaticNat(params: Record<string, any>): Promise<any> {
    return this.makeRequest('disableStaticNat', params);
  }

  public async createIpForwardingRule(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createIpForwardingRule', params);
  }

  public async deleteIpForwardingRule(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteIpForwardingRule', params);
  }

  public async listIpForwardingRules(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listIpForwardingRules', params);
  }

  // Port Forwarding Management
  public async createPortForwardingRule(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createPortForwardingRule', params);
  }

  public async deletePortForwardingRule(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deletePortForwardingRule', params);
  }

  public async listPortForwardingRules(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listPortForwardingRules', params);
  }

  public async updatePortForwardingRule(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updatePortForwardingRule', params);
  }

  // VLAN Management
  public async dedicatePublicIpRange(params: Record<string, any>): Promise<any> {
    return this.makeRequest('dedicatePublicIpRange', params);
  }

  public async releasePublicIpRange(params: Record<string, any>): Promise<any> {
    return this.makeRequest('releasePublicIpRange', params);
  }

  public async createVlanIpRange(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createVlanIpRange', params);
  }

  public async deleteVlanIpRange(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteVlanIpRange', params);
  }

  public async listVlanIpRanges(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listVlanIpRanges', params);
  }

  // Network ACL Management
  public async createNetworkACL(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createNetworkACL', params);
  }

  public async deleteNetworkACL(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteNetworkACL', params);
  }

  public async listNetworkACLs(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listNetworkACLs', params);
  }

  // Virtual Router Management
  public async startRouter(params: Record<string, any>): Promise<any> {
    return this.makeRequest('startRouter', params);
  }

  public async stopRouter(params: Record<string, any>): Promise<any> {
    return this.makeRequest('stopRouter', params);
  }

  public async rebootRouter(params: Record<string, any>): Promise<any> {
    return this.makeRequest('rebootRouter', params);
  }

  public async destroyRouter(params: Record<string, any>): Promise<any> {
    return this.makeRequest('destroyRouter', params);
  }

  public async listRouters(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listRouters', params);
  }

  public async changeServiceForRouter(params: Record<string, any>): Promise<any> {
    return this.makeRequest('changeServiceForRouter', params);
  }

  // Complete Virtual Machine Management APIs
  public async assignVirtualMachineToBackupOffering(params: Record<string, any>): Promise<any> {
    return this.makeRequest('assignVirtualMachineToBackupOffering', params);
  }

  public async createVMSchedule(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createVMSchedule', params);
  }

  public async deleteVMSchedule(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteVMSchedule', params);
  }

  public async listVMSchedule(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listVMSchedule', params);
  }

  public async getVirtualMachineUserData(params: Record<string, any>): Promise<any> {
    return this.makeRequest('getVirtualMachineUserData', params);
  }

  public async resetUserDataForVirtualMachine(params: Record<string, any>): Promise<any> {
    return this.makeRequest('resetUserDataForVirtualMachine', params);
  }

  public async listVirtualMachinesMetrics(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listVirtualMachinesMetrics', params);
  }

  public async listVirtualMachinesUsageHistory(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listVirtualMachinesUsageHistory', params);
  }

  public async migrateVirtualMachineWithVolume(params: Record<string, any>): Promise<any> {
    return this.makeRequest('migrateVirtualMachineWithVolume', params);
  }

  public async importVm(params: Record<string, any>): Promise<any> {
    return this.makeRequest('importVm', params);
  }

  public async importUnmanagedInstance(params: Record<string, any>): Promise<any> {
    return this.makeRequest('importUnmanagedInstance', params);
  }

  public async cleanVMReservations(params: Record<string, any>): Promise<any> {
    return this.makeRequest('cleanVMReservations', params);
  }

  public async enableVirtualMachineHa(params: Record<string, any>): Promise<any> {
    return this.makeRequest('enableVirtualMachineHa', params);
  }

  public async disableVirtualMachineHa(params: Record<string, any>): Promise<any> {
    return this.makeRequest('disableVirtualMachineHa', params);
  }

  public async listVirtualMachineSnapshots(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listVirtualMachineSnapshots', params);
  }

  public async createVMSnapshot(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createVMSnapshot', params);
  }

  public async deleteVMSnapshot(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteVMSnapshot', params);
  }

  public async revertToVMSnapshot(params: Record<string, any>): Promise<any> {
    return this.makeRequest('revertToVMSnapshot', params);
  }

  public async updateVMSnapshot(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateVMSnapshot', params);
  }

  public async createVirtualMachineSnapshot(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createVirtualMachineSnapshot', params);
  }

  public async deleteVirtualMachineSnapshot(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteVirtualMachineSnapshot', params);
  }

  public async configureVirtualMachine(params: Record<string, any>): Promise<any> {
    return this.makeRequest('configureVirtualMachine', params);
  }

  public async linkVirtualMachineToBackup(params: Record<string, any>): Promise<any> {
    return this.makeRequest('linkVirtualMachineToBackup', params);
  }

  public async unlinkVirtualMachineFromBackup(params: Record<string, any>): Promise<any> {
    return this.makeRequest('unlinkVirtualMachineFromBackup', params);
  }

  public async upgradeVirtualMachine(params: Record<string, any>): Promise<any> {
    return this.makeRequest('upgradeVirtualMachine', params);
  }

  public async findHostsForMigration(params: Record<string, any>): Promise<any> {
    return this.makeRequest('findHostsForMigration', params);
  }

  public async listVirtualMachineAffinityGroups(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listVirtualMachineAffinityGroups', params);
  }

  public async updateVMAffinityGroup(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateVMAffinityGroup', params);
  }

  // Account Management APIs
  public async createAccount(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createAccount', params);
  }

  public async listAccounts(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listAccounts', params);
  }

  public async deleteAccount(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteAccount', params);
  }

  public async updateAccount(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateAccount', params);
  }

  public async enableAccount(params: Record<string, any>): Promise<any> {
    return this.makeRequest('enableAccount', params);
  }

  public async disableAccount(params: Record<string, any>): Promise<any> {
    return this.makeRequest('disableAccount', params);
  }

  public async lockAccount(params: Record<string, any>): Promise<any> {
    return this.makeRequest('lockAccount', params);
  }

  // Domain Management APIs
  public async createDomain(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createDomain', params);
  }

  public async listDomains(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listDomains', params);
  }

  public async deleteDomain(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteDomain', params);
  }

  public async updateDomain(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateDomain', params);
  }

  public async listDomainChildren(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listDomainChildren', params);
  }

  // User Management APIs
  public async createUser(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createUser', params);
  }

  public async listUsers(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listUsers', params);
  }

  public async deleteUser(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteUser', params);
  }

  public async updateUser(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateUser', params);
  }

  public async enableUser(params: Record<string, any>): Promise<any> {
    return this.makeRequest('enableUser', params);
  }

  public async disableUser(params: Record<string, any>): Promise<any> {
    return this.makeRequest('disableUser', params);
  }

  public async lockUser(params: Record<string, any>): Promise<any> {
    return this.makeRequest('lockUser', params);
  }

  public async registerUserKeys(params: Record<string, any>): Promise<any> {
    return this.makeRequest('registerUserKeys', params);
  }

  // Resource Limits and Quotas APIs
  public async listResourceLimits(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listResourceLimits', params);
  }

  public async updateResourceLimit(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateResourceLimit', params);
  }

  public async updateResourceCount(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('updateResourceCount', params);
  }

  // Role and Permission Management APIs
  public async createRole(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createRole', params);
  }

  public async listRoles(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listRoles', params);
  }

  public async updateRole(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateRole', params);
  }

  public async deleteRole(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteRole', params);
  }

  public async createRolePermission(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createRolePermission', params);
  }

  public async listRolePermissions(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listRolePermissions', params);
  }

  public async updateRolePermission(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateRolePermission', params);
  }

  public async deleteRolePermission(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteRolePermission', params);
  }

  // Project Management APIs
  public async createProject(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createProject', params);
  }

  public async listProjects(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listProjects', params);
  }

  public async deleteProject(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteProject', params);
  }

  public async updateProject(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateProject', params);
  }

  public async activateProject(params: Record<string, any>): Promise<any> {
    return this.makeRequest('activateProject', params);
  }

  public async suspendProject(params: Record<string, any>): Promise<any> {
    return this.makeRequest('suspendProject', params);
  }

  public async addAccountToProject(params: Record<string, any>): Promise<any> {
    return this.makeRequest('addAccountToProject', params);
  }

  public async deleteAccountFromProject(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteAccountFromProject', params);
  }

  public async listProjectAccounts(params: Record<string, any>): Promise<any> {
    return this.makeRequest('listProjectAccounts', params);
  }

  // LDAP Integration APIs
  public async addLdapConfiguration(params: Record<string, any>): Promise<any> {
    return this.makeRequest('addLdapConfiguration', params);
  }

  public async listLdapUsers(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listLdapUsers', params);
  }

  public async ldapCreateAccount(params: Record<string, any>): Promise<any> {
    return this.makeRequest('ldapCreateAccount', params);
  }

  public async importLdapUsers(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('importLdapUsers', params);
  }

  // System Administration & Configuration
  public async listConfigurations(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listConfigurations', params);
  }

  public async updateConfiguration(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateConfiguration', params);
  }

  public async listCapabilities(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listCapabilities', params);
  }

  public async listAlerts(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listAlerts', params);
  }

  public async archiveAlerts(params: Record<string, any>): Promise<any> {
    return this.makeRequest('archiveAlerts', params);
  }

  public async deleteAlerts(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteAlerts', params);
  }

  public async listEvents(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listEvents', params);
  }

  public async archiveEvents(params: Record<string, any>): Promise<any> {
    return this.makeRequest('archiveEvents', params);
  }

  public async deleteEvents(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteEvents', params);
  }

  public async listSystemVms(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listSystemVms', params);
  }

  public async startSystemVm(params: Record<string, any>): Promise<any> {
    return this.makeRequest('startSystemVm', params);
  }

  public async stopSystemVm(params: Record<string, any>): Promise<any> {
    return this.makeRequest('stopSystemVm', params);
  }

  public async rebootSystemVm(params: Record<string, any>): Promise<any> {
    return this.makeRequest('rebootSystemVm', params);
  }

  public async destroySystemVm(params: Record<string, any>): Promise<any> {
    return this.makeRequest('destroySystemVm', params);
  }

  public async migrateSystemVm(params: Record<string, any>): Promise<any> {
    return this.makeRequest('migrateSystemVm', params);
  }

  // Resource Management
  public async findStoragePoolsForMigration(params: Record<string, any>): Promise<any> {
    return this.makeRequest('findStoragePoolsForMigration', params);
  }

  public async listStoragePools(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listStoragePools', params);
  }

  public async createStoragePool(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createStoragePool', params);
  }

  public async updateStoragePool(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateStoragePool', params);
  }

  public async deleteStoragePool(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteStoragePool', params);
  }

  public async enableStorageMaintenance(params: Record<string, any>): Promise<any> {
    return this.makeRequest('enableStorageMaintenance', params);
  }

  public async cancelStorageMaintenance(params: Record<string, any>): Promise<any> {
    return this.makeRequest('cancelStorageMaintenance', params);
  }

  // Monitoring & Metrics
  public async listUsageRecords(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listUsageRecords', params);
  }

  public async generateUsageRecords(params: Record<string, any>): Promise<any> {
    return this.makeRequest('generateUsageRecords', params);
  }

  public async listUsageTypes(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listUsageTypes', params);
  }

  public async listCapacity(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listCapacity', params);
  }

  public async listAsyncJobs(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listAsyncJobs', params);
  }

  public async queryAsyncJobResult(params: Record<string, any>): Promise<any> {
    return this.makeRequest('queryAsyncJobResult', params);
  }

  // Volume Encryption
  public async changeOfferingForVolume(params: Record<string, any>): Promise<any> {
    return this.makeRequest('changeOfferingForVolume', params);
  }

  public async createDiskOffering(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createDiskOffering', params);
  }

  public async updateDiskOffering(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateDiskOffering', params);
  }
}