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

  // Template Management functions moved to avoid duplication

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

  public async listRouterHealth(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listRouterHealth', params);
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

  // Volume Encryption and Disk Offering functions moved to avoid duplication
  public async updateDiskOffering(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateDiskOffering', params);
  }


  // Network Service Providers
  public async listNetworkServiceProviders(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listNetworkServiceProviders', params);
  }

  public async addNetworkServiceProvider(params: Record<string, any>): Promise<any> {
    return this.makeRequest('addNetworkServiceProvider', params);
  }

  public async deleteNetworkServiceProvider(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteNetworkServiceProvider', params);
  }

  public async updateNetworkServiceProvider(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateNetworkServiceProvider', params);
  }

  // Egress Firewall Rules
  public async createEgressFirewallRule(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createEgressFirewallRule', params);
  }

  public async deleteEgressFirewallRule(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteEgressFirewallRule', params);
  }

  public async listEgressFirewallRules(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listEgressFirewallRules', params);
  }


  // DHCP Management
  public async listDhcpOptions(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listDhcpOptions', params);
  }

  public async createDhcpOption(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createDhcpOption', params);
  }

  public async deleteDhcpOption(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteDhcpOption', params);
  }

  // Virtual Network Functions
  public async listNetworkPermissions(params: Record<string, any>): Promise<any> {
    return this.makeRequest('listNetworkPermissions', params);
  }

  public async resetNetworkPermissions(params: Record<string, any>): Promise<any> {
    return this.makeRequest('resetNetworkPermissions', params);
  }

  // NIC Management (re-added essential methods)
  public async listNics(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listNics', params);
  }

  // Network Device Management (re-added essential methods)
  public async listNetworkDevice(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listNetworkDevice', params);
  }

  public async addNetworkDevice(params: Record<string, any>): Promise<any> {
    return this.makeRequest('addNetworkDevice', params);
  }

  public async deleteNetworkDevice(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteNetworkDevice', params);
  }

  // Advanced VPC Functions  
  public async replaceNetworkACLList(params: Record<string, any>): Promise<any> {
    return this.makeRequest('replaceNetworkACLList', params);
  }

  public async moveNetworkAclItem(params: Record<string, any>): Promise<any> {
    return this.makeRequest('moveNetworkAclItem', params);
  }

  // Network Tags
  public async createTags(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createTags', params);
  }

  public async deleteTags(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteTags', params);
  }

  public async listTags(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listTags', params);
  }

  // VM Guest OS Management
  public async updateVirtualMachineGuestOs(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateVirtualMachineGuestOs', params);
  }

  public async listGuestOsMapping(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listGuestOsMapping', params);
  }

  public async addGuestOsMapping(params: Record<string, any>): Promise<any> {
    return this.makeRequest('addGuestOsMapping', params);
  }

  public async removeGuestOsMapping(params: Record<string, any>): Promise<any> {
    return this.makeRequest('removeGuestOsMapping', params);
  }

  public async listOsTypes(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listOsTypes', params);
  }

  public async listOsCategories(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listOsCategories', params);
  }

  // VM Console & Remote Access
  public async getVirtualMachineConsoleUrl(params: Record<string, any>): Promise<any> {
    return this.makeRequest('getVirtualMachineConsoleUrl', params);
  }

  public async getVirtualMachineVncUrl(params: Record<string, any>): Promise<any> {
    return this.makeRequest('getVirtualMachineVncUrl', params);
  }

  // VM Template & Cloning Operations
  public async createTemplateFromVirtualMachine(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createTemplateFromVirtualMachine', params);
  }

  public async cloneVirtualMachine(params: Record<string, any>): Promise<any> {
    return this.makeRequest('cloneVirtualMachine', params);
  }

  public async copyVirtualMachine(params: Record<string, any>): Promise<any> {
    return this.makeRequest('copyVirtualMachine', params);
  }

  // VM Backup & Recovery (Extended)
  public async createVirtualMachineBackup(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createVirtualMachineBackup', params);
  }

  public async restoreVirtualMachineBackup(params: Record<string, any>): Promise<any> {
    return this.makeRequest('restoreVirtualMachineBackup', params);
  }

  public async listVirtualMachineBackups(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listVirtualMachineBackups', params);
  }

  public async deleteVirtualMachineBackup(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteVirtualMachineBackup', params);
  }

  public async scheduleVirtualMachineBackup(params: Record<string, any>): Promise<any> {
    return this.makeRequest('scheduleVirtualMachineBackup', params);
  }

  // VM User Data & Metadata (Extended)
  public async updateVirtualMachineMetadata(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateVirtualMachineMetadata', params);
  }

  public async listVirtualMachineMetadata(params: Record<string, any>): Promise<any> {
    return this.makeRequest('listVirtualMachineMetadata', params);
  }

  public async deleteVirtualMachineMetadata(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteVirtualMachineMetadata', params);
  }

  public async updateVirtualMachineUserData(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateVirtualMachineUserData', params);
  }

  // VM SSH Key Management
  public async resetSSHKeyForVirtualMachine(params: Record<string, any>): Promise<any> {
    return this.makeRequest('resetSSHKeyForVirtualMachine', params);
  }

  public async addSSHKeyToVirtualMachine(params: Record<string, any>): Promise<any> {
    return this.makeRequest('addSSHKeyToVirtualMachine', params);
  }

  public async removeSSHKeyFromVirtualMachine(params: Record<string, any>): Promise<any> {
    return this.makeRequest('removeSSHKeyFromVirtualMachine', params);
  }

  public async listVirtualMachineSSHKeys(params: Record<string, any>): Promise<any> {
    return this.makeRequest('listVirtualMachineSSHKeys', params);
  }

  // VM Network Advanced Operations
  public async addIpToNic(params: Record<string, any>): Promise<any> {
    return this.makeRequest('addIpToNic', params);
  }

  public async removeIpFromNic(params: Record<string, any>): Promise<any> {
    return this.makeRequest('removeIpFromNic', params);
  }

  public async updateVirtualMachineNicIp(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateVirtualMachineNicIp', params);
  }

  public async listVirtualMachineNics(params: Record<string, any>): Promise<any> {
    return this.makeRequest('listVirtualMachineNics', params);
  }

  // VM Performance & Diagnostics
  public async getVirtualMachineStatistics(params: Record<string, any>): Promise<any> {
    return this.makeRequest('getVirtualMachineStatistics', params);
  }

  public async getVirtualMachinePerformanceMetrics(params: Record<string, any>): Promise<any> {
    return this.makeRequest('getVirtualMachinePerformanceMetrics', params);
  }

  public async runVirtualMachineDiagnostics(params: Record<string, any>): Promise<any> {
    return this.makeRequest('runVirtualMachineDiagnostics', params);
  }

  public async getVirtualMachineSystemEvents(params: Record<string, any>): Promise<any> {
    return this.makeRequest('getVirtualMachineSystemEvents', params);
  }

  // VM Unmanaged Operations
  public async unmanageVirtualMachine(params: Record<string, any>): Promise<any> {
    return this.makeRequest('unmanageVirtualMachine', params);
  }

  public async adoptVirtualMachine(params: Record<string, any>): Promise<any> {
    return this.makeRequest('adoptVirtualMachine', params);
  }

  public async listUnmanagedVirtualMachines(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listUnmanagedVirtualMachines', params);
  }

  // Advanced Volume Operations
  public async assignVolume(params: Record<string, any>): Promise<any> {
    return this.makeRequest('assignVolume', params);
  }

  public async checkVolume(params: Record<string, any>): Promise<any> {
    return this.makeRequest('checkVolume', params);
  }

  public async destroyVolume(params: Record<string, any>): Promise<any> {
    return this.makeRequest('destroyVolume', params);
  }

  public async getPathForVolume(params: Record<string, any>): Promise<any> {
    return this.makeRequest('getPathForVolume', params);
  }

  public async getUploadParamsForVolume(params: Record<string, any>): Promise<any> {
    return this.makeRequest('getUploadParamsForVolume', params);
  }

  public async getVolumeiScsiName(params: Record<string, any>): Promise<any> {
    return this.makeRequest('getVolumeiScsiName', params);
  }

  public async importVolume(params: Record<string, any>): Promise<any> {
    return this.makeRequest('importVolume', params);
  }

  public async listVolumesForImport(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listVolumesForImport', params);
  }

  public async listVolumesUsageHistory(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listVolumesUsageHistory', params);
  }

  public async recoverVolume(params: Record<string, any>): Promise<any> {
    return this.makeRequest('recoverVolume', params);
  }

  public async restoreVolumeFromBackupAndAttachToVM(params: Record<string, any>): Promise<any> {
    return this.makeRequest('restoreVolumeFromBackupAndAttachToVM', params);
  }

  public async unmanageVolume(params: Record<string, any>): Promise<any> {
    return this.makeRequest('unmanageVolume', params);
  }

  public async updateVolume(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateVolume', params);
  }

  public async changeOfferingForVolume(params: Record<string, any>): Promise<any> {
    return this.makeRequest('changeOfferingForVolume', params);
  }

  // Disk Offering Management
  public async createDiskOffering(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createDiskOffering', params);
  }

  public async deleteDiskOffering(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteDiskOffering', params);
  }

  // Advanced Snapshot Operations
  public async archiveSnapshot(params: Record<string, any>): Promise<any> {
    return this.makeRequest('archiveSnapshot', params);
  }

  public async copySnapshot(params: Record<string, any>): Promise<any> {
    return this.makeRequest('copySnapshot', params);
  }

  public async createSnapshotFromVMSnapshot(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createSnapshotFromVMSnapshot', params);
  }

  public async createSnapshotPolicy(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createSnapshotPolicy', params);
  }

  public async deleteSnapshotPolicies(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteSnapshotPolicies', params);
  }

  public async extractSnapshot(params: Record<string, any>): Promise<any> {
    return this.makeRequest('extractSnapshot', params);
  }

  public async getVolumeSnapshotDetails(params: Record<string, any>): Promise<any> {
    return this.makeRequest('getVolumeSnapshotDetails', params);
  }

  public async listSnapshotPolicies(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listSnapshotPolicies', params);
  }

  public async updateSnapshotPolicy(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateSnapshotPolicy', params);
  }

  // Storage Pool Advanced Management
  public async changeStoragePoolScope(params: Record<string, any>): Promise<any> {
    return this.makeRequest('changeStoragePoolScope', params);
  }

  public async listAffectedVmsForStorageScopeChange(params: Record<string, any>): Promise<any> {
    return this.makeRequest('listAffectedVmsForStorageScopeChange', params);
  }

  public async listStoragePoolObjects(params: Record<string, any>): Promise<any> {
    return this.makeRequest('listStoragePoolObjects', params);
  }

  public async listStorageProviders(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listStorageProviders', params);
  }

  public async syncStoragePool(params: Record<string, any>): Promise<any> {
    return this.makeRequest('syncStoragePool', params);
  }

  public async updateStorageCapabilities(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateStorageCapabilities', params);
  }

  // Secondary Storage Management
  public async addSecondaryStorage(params: Record<string, any>): Promise<any> {
    return this.makeRequest('addSecondaryStorage', params);
  }

  public async createSecondaryStagingStore(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createSecondaryStagingStore', params);
  }

  public async deleteSecondaryStagingStore(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteSecondaryStagingStore', params);
  }

  public async listSecondaryStagingStores(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listSecondaryStagingStores', params);
  }

  public async migrateSecondaryStorageData(params: Record<string, any>): Promise<any> {
    return this.makeRequest('migrateSecondaryStorageData', params);
  }

  // Template Management
  public async copyTemplate(params: Record<string, any>): Promise<any> {
    return this.makeRequest('copyTemplate', params);
  }

  public async createTemplate(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createTemplate', params);
  }

  public async deleteTemplate(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteTemplate', params);
  }

  public async extractTemplate(params: Record<string, any>): Promise<any> {
    return this.makeRequest('extractTemplate', params);
  }

  public async getUploadParamsForTemplate(params: Record<string, any>): Promise<any> {
    return this.makeRequest('getUploadParamsForTemplate', params);
  }

  public async listTemplatePermissions(params: Record<string, any>): Promise<any> {
    return this.makeRequest('listTemplatePermissions', params);
  }

  public async listTemplates(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listTemplates', params);
  }

  public async prepareTemplate(params: Record<string, any>): Promise<any> {
    return this.makeRequest('prepareTemplate', params);
  }

  public async registerTemplate(params: Record<string, any>): Promise<any> {
    return this.makeRequest('registerTemplate', params);
  }

  public async updateTemplate(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateTemplate', params);
  }

  public async updateTemplatePermissions(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateTemplatePermissions', params);
  }

  // ISO Management
  public async attachIso(params: Record<string, any>): Promise<any> {
    return this.makeRequest('attachIso', params);
  }

  public async copyIso(params: Record<string, any>): Promise<any> {
    return this.makeRequest('copyIso', params);
  }

  public async deleteIso(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteIso', params);
  }

  public async detachIso(params: Record<string, any>): Promise<any> {
    return this.makeRequest('detachIso', params);
  }

  public async extractIso(params: Record<string, any>): Promise<any> {
    return this.makeRequest('extractIso', params);
  }

  public async getUploadParamsForIso(params: Record<string, any>): Promise<any> {
    return this.makeRequest('getUploadParamsForIso', params);
  }

  public async listIsoPermissions(params: Record<string, any>): Promise<any> {
    return this.makeRequest('listIsoPermissions', params);
  }

  public async listIsos(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listIsos', params);
  }

  public async registerIso(params: Record<string, any>): Promise<any> {
    return this.makeRequest('registerIso', params);
  }

  public async updateIso(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateIso', params);
  }

  public async updateIsoPermissions(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateIsoPermissions', params);
  }

  // Backup and Recovery
  public async createBackup(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createBackup', params);
  }

  public async createBackupSchedule(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createBackupSchedule', params);
  }

  public async deleteBackup(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteBackup', params);
  }

  public async deleteBackupOffering(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteBackupOffering', params);
  }

  public async deleteBackupSchedule(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteBackupSchedule', params);
  }

  public async listBackupOfferings(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listBackupOfferings', params);
  }

  public async listBackups(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listBackups', params);
  }

  public async restoreBackup(params: Record<string, any>): Promise<any> {
    return this.makeRequest('restoreBackup', params);
  }

  public async updateBackupSchedule(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateBackupSchedule', params);
  }

  // Object Storage Integration
  public async addObjectStoragePool(params: Record<string, any>): Promise<any> {
    return this.makeRequest('addObjectStoragePool', params);
  }

  public async createBucket(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createBucket', params);
  }

  public async deleteBucket(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteBucket', params);
  }

  public async deleteObjectStoragePool(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteObjectStoragePool', params);
  }

  public async listBuckets(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listBuckets', params);
  }

  public async listObjectStoragePools(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listObjectStoragePools', params);
  }

  public async updateBucket(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateBucket', params);
  }

  public async updateObjectStoragePool(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateObjectStoragePool', params);
  }

  // Volume Annotations
  public async addAnnotation(params: Record<string, any>): Promise<any> {
    return this.makeRequest('addAnnotation', params);
  }

  public async listAnnotations(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listAnnotations', params);
  }

  public async removeAnnotation(params: Record<string, any>): Promise<any> {
    return this.makeRequest('removeAnnotation', params);
  }

  public async updateAnnotationVisibility(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateAnnotationVisibility', params);
  }

  // Kubernetes Service Management
  public async addKubernetesSupportedVersion(params: Record<string, any>): Promise<any> {
    return this.makeRequest('addKubernetesSupportedVersion', params);
  }

  public async addVirtualMachinesToKubernetesCluster(params: Record<string, any>): Promise<any> {
    return this.makeRequest('addVirtualMachinesToKubernetesCluster', params);
  }

  public async createKubernetesCluster(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createKubernetesCluster', params);
  }

  public async deleteKubernetesCluster(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteKubernetesCluster', params);
  }

  public async deleteKubernetesSupportedVersion(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteKubernetesSupportedVersion', params);
  }

  public async getKubernetesClusterConfig(params: Record<string, any>): Promise<any> {
    return this.makeRequest('getKubernetesClusterConfig', params);
  }

  public async listKubernetesClusters(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listKubernetesClusters', params);
  }

  public async listKubernetesSupportedVersions(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listKubernetesSupportedVersions', params);
  }

  public async removeVirtualMachinesFromKubernetesCluster(params: Record<string, any>): Promise<any> {
    return this.makeRequest('removeVirtualMachinesFromKubernetesCluster', params);
  }

  public async scaleKubernetesCluster(params: Record<string, any>): Promise<any> {
    return this.makeRequest('scaleKubernetesCluster', params);
  }

  public async startKubernetesCluster(params: Record<string, any>): Promise<any> {
    return this.makeRequest('startKubernetesCluster', params);
  }

  public async stopKubernetesCluster(params: Record<string, any>): Promise<any> {
    return this.makeRequest('stopKubernetesCluster', params);
  }

  public async updateKubernetesSupportedVersion(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateKubernetesSupportedVersion', params);
  }

  public async upgradeKubernetesCluster(params: Record<string, any>): Promise<any> {
    return this.makeRequest('upgradeKubernetesCluster', params);
  }

  // System VM Management
  public async changeServiceForSystemVm(params: Record<string, any>): Promise<any> {
    return this.makeRequest('changeServiceForSystemVm', params);
  }

  public async listSystemVmsUsageHistory(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listSystemVmsUsageHistory', params);
  }

  public async patchSystemVm(params: Record<string, any>): Promise<any> {
    return this.makeRequest('patchSystemVm', params);
  }

  public async scaleSystemVm(params: Record<string, any>): Promise<any> {
    return this.makeRequest('scaleSystemVm', params);
  }

  // Zone Management
  public async createZone(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createZone', params);
  }

  public async deleteZone(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteZone', params);
  }

  public async updateZone(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateZone', params);
  }

  public async enableHAForZone(params: Record<string, any>): Promise<any> {
    return this.makeRequest('enableHAForZone', params);
  }

  public async disableHAForZone(params: Record<string, any>): Promise<any> {
    return this.makeRequest('disableHAForZone', params);
  }

  public async createIpv4SubnetForZone(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createIpv4SubnetForZone', params);
  }

  public async deleteIpv4SubnetForZone(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteIpv4SubnetForZone', params);
  }

  public async updateIpv4SubnetForZone(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateIpv4SubnetForZone', params);
  }

  public async listIpv4SubnetsForZone(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listIpv4SubnetsForZone', params);
  }

  public async dedicateZone(params: Record<string, any>): Promise<any> {
    return this.makeRequest('dedicateZone', params);
  }

  public async listDedicatedZones(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listDedicatedZones', params);
  }

  public async releaseDedicatedZone(params: Record<string, any>): Promise<any> {
    return this.makeRequest('releaseDedicatedZone', params);
  }

  public async addVmwareDc(params: Record<string, any>): Promise<any> {
    return this.makeRequest('addVmwareDc', params);
  }

  public async removeVmwareDc(params: Record<string, any>): Promise<any> {
    return this.makeRequest('removeVmwareDc', params);
  }

  public async updateVmwareDc(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateVmwareDc', params);
  }

  public async listVmwareDcs(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listVmwareDcs', params);
  }

  public async listVmwareDcVms(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listVmwareDcVms', params);
  }

  // Host Management
  public async addHost(params: Record<string, any>): Promise<any> {
    return this.makeRequest('addHost', params);
  }

  public async deleteHost(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteHost', params);
  }

  public async updateHost(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateHost', params);
  }

  public async prepareHostForMaintenance(params: Record<string, any>): Promise<any> {
    return this.makeRequest('prepareHostForMaintenance', params);
  }

  public async cancelHostMaintenance(params: Record<string, any>): Promise<any> {
    return this.makeRequest('cancelHostMaintenance', params);
  }

  public async configureHAForHost(params: Record<string, any>): Promise<any> {
    return this.makeRequest('configureHAForHost', params);
  }

  public async enableHAForHost(params: Record<string, any>): Promise<any> {
    return this.makeRequest('enableHAForHost', params);
  }

  public async disableHAForHost(params: Record<string, any>): Promise<any> {
    return this.makeRequest('disableHAForHost', params);
  }

  public async listHostHAProviders(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listHostHAProviders', params);
  }

  public async listHostHAResources(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listHostHAResources', params);
  }

  public async listHostsMetrics(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listHostsMetrics', params);
  }

  public async reconnectHost(params: Record<string, any>): Promise<any> {
    return this.makeRequest('reconnectHost', params);
  }

  public async declareHostAsDegraded(params: Record<string, any>): Promise<any> {
    return this.makeRequest('declareHostAsDegraded', params);
  }

  public async cancelHostAsDegraded(params: Record<string, any>): Promise<any> {
    return this.makeRequest('cancelHostAsDegraded', params);
  }

  public async listHostTags(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listHostTags', params);
  }

  public async releaseHostReservation(params: Record<string, any>): Promise<any> {
    return this.makeRequest('releaseHostReservation', params);
  }

  public async updateHostPassword(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateHostPassword', params);
  }

  public async listDedicatedHosts(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listDedicatedHosts', params);
  }

  public async dedicateHost(params: Record<string, any>): Promise<any> {
    return this.makeRequest('dedicateHost', params);
  }

  public async releaseDedicatedHost(params: Record<string, any>): Promise<any> {
    return this.makeRequest('releaseDedicatedHost', params);
  }

  // IPv6 Firewall Management
  public async createIpv6FirewallRule(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createIpv6FirewallRule', params);
  }

  public async deleteIpv6FirewallRule(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteIpv6FirewallRule', params);
  }

  public async updateIpv6FirewallRule(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateIpv6FirewallRule', params);
  }

  public async listIpv6FirewallRules(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listIpv6FirewallRules', params);
  }

  // Routing Firewall Management
  public async createRoutingFirewallRule(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createRoutingFirewallRule', params);
  }

  public async deleteRoutingFirewallRule(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteRoutingFirewallRule', params);
  }

  public async updateRoutingFirewallRule(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateRoutingFirewallRule', params);
  }

  public async listRoutingFirewallRules(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listRoutingFirewallRules', params);
  }

  // BGP Peer Management
  public async createBgpPeer(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createBgpPeer', params);
  }

  public async deleteBgpPeer(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteBgpPeer', params);
  }

  public async updateBgpPeer(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateBgpPeer', params);
  }

  public async listBgpPeers(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listBgpPeers', params);
  }

  public async dedicateBgpPeer(params: Record<string, any>): Promise<any> {
    return this.makeRequest('dedicateBgpPeer', params);
  }

  public async releaseBgpPeer(params: Record<string, any>): Promise<any> {
    return this.makeRequest('releaseBgpPeer', params);
  }

  // Advanced VPC Management
  public async migrateVpc(params: Record<string, any>): Promise<any> {
    return this.makeRequest('migrateVpc', params);
  }

  // IPv4 Subnet Management
  public async dedicateIpv4SubnetForZone(params: Record<string, any>): Promise<any> {
    return this.makeRequest('dedicateIpv4SubnetForZone', params);
  }

  public async releaseIpv4SubnetForZone(params: Record<string, any>): Promise<any> {
    return this.makeRequest('releaseIpv4SubnetForZone', params);
  }

  public async createIpv4SubnetForGuestNetwork(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createIpv4SubnetForGuestNetwork', params);
  }

  public async deleteIpv4SubnetForGuestNetwork(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteIpv4SubnetForGuestNetwork', params);
  }

  public async listIpv4SubnetsForGuestNetwork(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listIpv4SubnetsForGuestNetwork', params);
  }

  // Enhanced Network ACL Management
  public async updateNetworkACL(params: Record<string, any>): Promise<any> {
    return this.makeRequest('updateNetworkACL', params);
  }

}