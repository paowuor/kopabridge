export interface ProviderConnector {
  getAuthorizationUrl(userId: string): Promise<string>;
  exchangeToken(code: string): Promise<string>;
  fetchCustomerData(accessToken: string): Promise<any>;
}
