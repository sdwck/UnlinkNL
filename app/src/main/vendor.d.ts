declare module 'macaddress' {
  export interface MacAddressInfo {
    mac: string;
    family: 'IPv4' | 'IPv6';
    iface?: string;
    netmask?: string;
    internal?: boolean;
    cidr?: string;
    mac_id?: string; 
  }

  export function all(): Promise<{ [interfaceName: string]: MacAddressInfo }>;
}