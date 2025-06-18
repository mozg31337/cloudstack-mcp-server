export interface CloudStackConfig {
  environments: Record<string, CloudStackEnvironment>;
  defaultEnvironment: string;
  logging: {
    level: string;
    file: string;
  };
}

export interface CloudStackEnvironment {
  name: string;
  apiUrl: string;
  apiKey: string;
  secretKey: string;
  timeout: number;
  retries: number;
}

export interface CloudStackResponse<T = any> {
  count?: number;
  [key: string]: T[] | T | number | string | undefined;
}

export interface CloudStackError {
  errorcode: number;
  errortext: string;
  cserrorcode?: number;
  uuidList?: string[];
}

export interface VirtualMachine {
  id: string;
  name: string;
  displayname: string;
  account: string;
  domainid: string;
  domain: string;
  created: string;
  state: string;
  haenable: boolean;
  hypervisor: string;
  instancename: string;
  templateid: string;
  templatename: string;
  templatedisplaytext: string;
  serviceofferingid: string;
  serviceofferingname: string;
  cpunumber: number;
  cpuspeed: number;
  memory: number;
  guestosid: string;
  rootdeviceid: number;
  rootdevicetype: string;
  securitygroup: SecurityGroup[];
  nic: NetworkInterface[];
  affinitygroup: AffinityGroup[];
  tags: ResourceTag[];
}

export interface Network {
  id: string;
  name: string;
  displaytext: string;
  broadcastdomaintype: string;
  traffictype: string;
  gateway: string;
  netmask: string;
  cidr: string;
  zoneid: string;
  zonename: string;
  networkofferingid: string;
  networkofferingname: string;
  state: string;
  related: string;
  dns1: string;
  dns2: string;
  type: string;
  vlan: string;
  account: string;
  domainid: string;
  domain: string;
  service: NetworkService[];
  tags: ResourceTag[];
}

export interface Volume {
  id: string;
  name: string;
  zoneid: string;
  zonename: string;
  type: string;
  deviceid: number;
  virtualmachineid: string;
  vmname: string;
  vmdisplayname: string;
  vmstate: string;
  size: number;
  created: string;
  state: string;
  account: string;
  domainid: string;
  domain: string;
  storagetype: string;
  hypervisor: string;
  diskofferingid: string;
  diskofferingname: string;
  tags: ResourceTag[];
}

export interface Snapshot {
  id: string;
  name: string;
  created: string;
  account: string;
  domainid: string;
  domain: string;
  intervaltype: string;
  snapshottype: string;
  volumeid: string;
  volumename: string;
  volumetype: string;
  state: string;
  physicalsize: number;
  tags: ResourceTag[];
}

export interface Zone {
  id: string;
  name: string;
  description: string;
  dns1: string;
  dns2: string;
  internaldns1: string;
  internaldns2: string;
  guestcidraddress: string;
  networktype: string;
  securitygroupsenabled: boolean;
  allocationstate: string;
  zonetoken: string;
  dhcpprovider: string;
  localstorageenabled: boolean;
  tags: ResourceTag[];
}

export interface Host {
  id: string;
  name: string;
  state: string;
  type: string;
  ipaddress: string;
  zoneid: string;
  zonename: string;
  podid: string;
  podname: string;
  clusterid: string;
  clustername: string;
  hypervisor: string;
  capabilities: string;
  lastpinged: string;
  created: string;
  removed: string;
  resourcestate: string;
  tags: ResourceTag[];
}

export interface SecurityGroup {
  id: string;
  name: string;
  description: string;
  account: string;
  domainid: string;
  domain: string;
  ingressrule: SecurityGroupRule[];
  egressrule: SecurityGroupRule[];
  tags: ResourceTag[];
}

export interface SecurityGroupRule {
  ruleid: string;
  protocol: string;
  startport: number;
  endport: number;
  cidr: string;
  account: string;
  securitygroupname: string;
  tags: ResourceTag[];
}

export interface NetworkInterface {
  id: string;
  networkid: string;
  networkname: string;
  netmask: string;
  gateway: string;
  ipaddress: string;
  isolationuri: string;
  broadcasturi: string;
  traffictype: string;
  type: string;
  isdefault: boolean;
  macaddress: string;
  secondaryip: SecondaryIP[];
}

export interface SecondaryIP {
  id: string;
  ipaddress: string;
  networkid: string;
}

export interface NetworkService {
  name: string;
  provider: ServiceProvider[];
}

export interface ServiceProvider {
  name: string;
  state: string;
}

export interface AffinityGroup {
  id: string;
  name: string;
  description: string;
  account: string;
  domainid: string;
  domain: string;
  type: string;
  virtualmachineIds: string[];
}

export interface ResourceTag {
  account: string;
  customer: string;
  domain: string;
  domainid: string;
  key: string;
  project: string;
  projectid: string;
  resourceid: string;
  resourcetype: string;
  value: string;
}

export interface ServiceOffering {
  id: string;
  name: string;
  displaytext: string;
  cpunumber: number;
  cpuspeed: number;
  memory: number;
  created: string;
  storagetype: string;
  provisioningtype: string;
  tags: string;
}

export interface DiskOffering {
  id: string;
  name: string;
  displaytext: string;
  disksize: number;
  created: string;
  storagetype: string;
  provisioningtype: string;
  tags: string;
}

export interface Template {
  id: string;
  name: string;
  displaytext: string;
  ispublic: boolean;
  created: string;
  isready: boolean;
  status: string;
  ostypeid: string;
  ostypename: string;
  account: string;
  zoneid: string;
  zonename: string;
  size: number;
  hypervisor: string;
  format: string;
  tags: ResourceTag[];
}