export interface ProviderConnector {
  getAuthorizationUrl(userId: string, state: string): Promise<string>;
  exchangeToken(code: string): Promise<string>;
  fetchCustomerData(accessToken: string): Promise<any>;
}
