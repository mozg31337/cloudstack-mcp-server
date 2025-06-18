export const mockVirtualMachinesResponse = {
  listvirtualmachinesresponse: {
    count: 2,
    virtualmachine: [
      {
        id: 'vm-12345',
        name: 'web-server-01',
        displayname: 'Web Server 01',
        account: 'admin',
        domainid: '1',
        domain: 'ROOT',
        created: '2024-01-15T10:30:00+0000',
        state: 'Running',
        haenable: false,
        hypervisor: 'KVM',
        instancename: 'i-2-123-VM',
        templateid: 'template-456',
        templatename: 'Ubuntu 22.04',
        templatedisplaytext: 'Ubuntu 22.04 LTS',
        serviceofferingid: 'offering-789',
        serviceofferingname: 'Medium Instance',
        cpunumber: 2,
        cpuspeed: 2000,
        memory: 4096,
        guestosid: 'ubuntu-22',
        rootdeviceid: 0,
        rootdevicetype: 'ROOT',
        zoneid: 'zone-1',
        zonename: 'Primary Zone',
        securitygroup: [],
        nic: [
          {
            id: 'nic-123',
            networkid: 'network-456',
            networkname: 'default-network',
            netmask: '255.255.255.0',
            gateway: '192.168.1.1',
            ipaddress: '192.168.1.100',
            isolationuri: 'vlan://100',
            broadcasturi: 'vlan://100',
            traffictype: 'Guest',
            type: 'Virtual',
            isdefault: true,
            macaddress: '02:00:12:34:56:78',
            secondaryip: []
          }
        ],
        affinitygroup: [],
        tags: []
      },
      {
        id: 'vm-67890',
        name: 'db-server-01',
        displayname: 'Database Server 01',
        account: 'admin',
        domainid: '1',
        domain: 'ROOT',
        created: '2024-01-14T15:45:00+0000',
        state: 'Stopped',
        haenable: false,
        hypervisor: 'KVM',
        instancename: 'i-2-456-VM',
        templateid: 'template-789',
        templatename: 'CentOS 8',
        templatedisplaytext: 'CentOS 8 Stream',
        serviceofferingid: 'offering-101',
        serviceofferingname: 'Large Instance',
        cpunumber: 4,
        cpuspeed: 2400,
        memory: 8192,
        guestosid: 'centos-8',
        rootdeviceid: 0,
        rootdevicetype: 'ROOT',
        zoneid: 'zone-1',
        zonename: 'Primary Zone',
        securitygroup: [],
        nic: [
          {
            id: 'nic-789',
            networkid: 'network-456',
            networkname: 'default-network',
            netmask: '255.255.255.0',
            gateway: '192.168.1.1',
            ipaddress: '192.168.1.101',
            isolationuri: 'vlan://100',
            broadcasturi: 'vlan://100',
            traffictype: 'Guest',
            type: 'Virtual',
            isdefault: true,
            macaddress: '02:00:98:76:54:32',
            secondaryip: []
          }
        ],
        affinitygroup: [],
        tags: []
      }
    ]
  }
};

export const mockNetworksResponse = {
  listnetworksresponse: {
    count: 1,
    network: [
      {
        id: 'network-456',
        name: 'default-network',
        displaytext: 'Default Guest Network',
        broadcastdomaintype: 'Vlan',
        traffictype: 'Guest',
        gateway: '192.168.1.1',
        netmask: '255.255.255.0',
        cidr: '192.168.1.0/24',
        zoneid: 'zone-1',
        zonename: 'Primary Zone',
        networkofferingid: 'offering-network-1',
        networkofferingname: 'DefaultIsolatedNetworkOffering',
        state: 'Implemented',
        related: 'network-456',
        dns1: '8.8.8.8',
        dns2: '8.8.4.4',
        type: 'Isolated',
        vlan: '100',
        account: 'admin',
        domainid: '1',
        domain: 'ROOT',
        service: [
          {
            name: 'Dhcp',
            provider: [
              {
                name: 'VirtualRouter',
                state: 'Enabled'
              }
            ]
          }
        ],
        tags: []
      }
    ]
  }
};

export const mockVolumesResponse = {
  listvolumesresponse: {
    count: 3,
    volume: [
      {
        id: 'volume-123',
        name: 'ROOT-123',
        zoneid: 'zone-1',
        zonename: 'Primary Zone',
        type: 'ROOT',
        deviceid: 0,
        virtualmachineid: 'vm-12345',
        vmname: 'web-server-01',
        vmdisplayname: 'Web Server 01',
        vmstate: 'Running',
        size: 21474836480,
        created: '2024-01-15T10:30:00+0000',
        state: 'Ready',
        account: 'admin',
        domainid: '1',
        domain: 'ROOT',
        storagetype: 'shared',
        hypervisor: 'KVM',
        diskofferingid: 'disk-offering-1',
        diskofferingname: 'Small Disk',
        tags: []
      },
      {
        id: 'volume-456',
        name: 'data-volume-01',
        zoneid: 'zone-1',
        zonename: 'Primary Zone',
        type: 'DATADISK',
        deviceid: 1,
        virtualmachineid: 'vm-12345',
        vmname: 'web-server-01',
        vmdisplayname: 'Web Server 01',
        vmstate: 'Running',
        size: 107374182400,
        created: '2024-01-15T11:00:00+0000',
        state: 'Ready',
        account: 'admin',
        domainid: '1',
        domain: 'ROOT',
        storagetype: 'shared',
        hypervisor: 'KVM',
        diskofferingid: 'disk-offering-2',
        diskofferingname: 'Large Disk',
        tags: []
      }
    ]
  }
};

export const mockZonesResponse = {
  listzonesresponse: {
    count: 1,
    zone: [
      {
        id: 'zone-1',
        name: 'Primary Zone',
        description: 'Primary datacenter zone',
        dns1: '8.8.8.8',
        dns2: '8.8.4.4',
        internaldns1: '192.168.1.1',
        internaldns2: '192.168.1.2',
        guestcidraddress: '10.1.1.0/24',
        networktype: 'Advanced',
        securitygroupsenabled: false,
        allocationstate: 'Enabled',
        zonetoken: 'zone-token-123',
        dhcpprovider: 'VirtualRouter',
        localstorageenabled: false,
        tags: []
      }
    ]
  }
};

export const mockErrorResponse = {
  errorcode: 401,
  errortext: 'Unable to verify user credentials and/or request signature',
  cserrorcode: 4350,
  uuidList: []
};

export const mockCapabilitiesResponse = {
  listcapabilitiesresponse: {
    capability: {
      securitygroupsenabled: true,
      cloudstackversion: '4.20.0.0',
      userpublictemplateenabled: true,
      supporteelb: false,
      projectinviterequired: false,
      allowusercreateprojects: true,
      customdiskofferingmaxsize: 1024,
      customdiskofferingminsize: 1,
      regionssecondaryenabled: true,
      kvmsnapshotenabled: true
    }
  }
};