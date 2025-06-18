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

  public async replaceNetworkACLList(params: Record<string, any>): Promise<any> {
    return this.makeRequest('replaceNetworkACLList', params);
  }

  public async createNetworkACLList(params: Record<string, any>): Promise<any> {
    return this.makeRequest('createNetworkACLList', params);
  }

  public async deleteNetworkACLList(params: Record<string, any>): Promise<any> {
    return this.makeRequest('deleteNetworkACLList', params);
  }

  public async listNetworkACLLists(params: Record<string, any> = {}): Promise<any> {
    return this.makeRequest('listNetworkACLLists', params);
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
}