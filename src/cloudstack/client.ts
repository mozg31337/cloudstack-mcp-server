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
}