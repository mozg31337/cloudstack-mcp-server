import crypto from 'crypto';
import { Logger } from '../utils/logger.js';

export class CloudStackAuth {
  private apiKey: string;
  private secretKey: string;

  constructor(apiKey: string, secretKey: string) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
  }

  public signRequest(params: Record<string, any>): string {
    const sortedParams = this.sortParameters(params);
    const queryString = this.buildQueryString(sortedParams);
    const signature = this.generateSignature(queryString);
    
    Logger.debug('Generated CloudStack API signature', { 
      queryString: queryString.substring(0, 200) + '...',
      signature: signature.substring(0, 20) + '...'
    });

    return signature;
  }

  public buildAuthenticatedUrl(baseUrl: string, params: Record<string, any>): string {
    const requestParams = {
      ...params,
      apikey: this.apiKey,
      response: 'json'
    };

    const signature = this.signRequest(requestParams);
    const authenticatedParams = {
      ...requestParams,
      signature
    };

    const queryString = this.buildQueryString(authenticatedParams);
    return `${baseUrl}?${queryString}`;
  }

  private sortParameters(params: Record<string, any>): Record<string, string> {
    const sortedParams: Record<string, string> = {};
    const keys = Object.keys(params).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    
    for (const key of keys) {
      const value = params[key];
      if (value !== null && value !== undefined) {
        sortedParams[key] = this.encodeValue(value);
      }
    }

    return sortedParams;
  }

  private encodeValue(value: any): string {
    if (typeof value === 'boolean') {
      return value.toString();
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    if (Array.isArray(value)) {
      return value.join(',');
    }
    return encodeURIComponent(String(value)).replace(/[!'()*]/g, (c) => {
      return '%' + c.charCodeAt(0).toString(16).toUpperCase();
    });
  }

  private buildQueryString(params: Record<string, string>): string {
    const pairs = Object.entries(params).map(([key, value]) => `${key}=${value}`);
    return pairs.join('&');
  }

  private generateSignature(queryString: string): string {
    const hash = crypto
      .createHmac('sha1', this.secretKey)
      .update(queryString.toLowerCase())
      .digest('base64');
    
    return encodeURIComponent(hash);
  }

  public signRequestRaw(params: Record<string, any>): string {
    const sortedParams = this.sortParameters(params);
    const queryString = this.buildQueryString(sortedParams);
    const hash = crypto
      .createHmac('sha1', this.secretKey)
      .update(queryString.toLowerCase())
      .digest('base64');
    
    Logger.debug('Generated CloudStack API raw signature', { 
      queryString: queryString.substring(0, 200) + '...',
      signature: hash.substring(0, 20) + '...'
    });

    return hash; // Return raw base64 hash without URL encoding
  }

  public validateCredentials(): boolean {
    return !!(this.apiKey && this.secretKey);
  }

  public getApiKey(): string {
    return this.apiKey;
  }

  public getEncodedParameters(params: Record<string, any>): Record<string, string> {
    return this.sortParameters(params);
  }

  public maskApiKey(): string {
    if (!this.apiKey || this.apiKey.length < 8) {
      return 'INVALID';
    }
    return this.apiKey.substring(0, 4) + '****' + this.apiKey.substring(this.apiKey.length - 4);
  }
}