// Error normalizado del proveedor. code: auth | rate_limit | quota | unavailable | bad_output | refused | config
export class ProviderError extends Error {
  constructor(code, message = code) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
  }
}
