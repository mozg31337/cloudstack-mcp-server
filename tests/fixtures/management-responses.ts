export const mockDeployVMResponse = {
  deployvirtualmachineresponse: {
    jobid: 'job-12345-deploy',
    id: 'job-12345-deploy',
    virtualmachine: {
      id: 'vm-new-12345',
      name: 'new-web-server',
      displayname: 'New Web Server',
      account: 'admin',
      domainid: '1',
      domain: 'ROOT',
      created: '2024-06-18T12:00:00+0000',
      state: 'Starting',
      haenable: false,
      hypervisor: 'KVM',
      instancename: 'i-2-789-VM',
      templateid: 'template-456',
      templatename: 'Ubuntu 22.04',
      serviceofferingid: 'offering-789',
      serviceofferingname: 'Medium Instance',
      cpunumber: 2,
      cpuspeed: 2000,
      memory: 4096,
      zoneid: 'zone-1',
      zonename: 'Primary Zone'
    }
  }
};

export const mockCreateVolumeResponse = {
  createvolumeresponse: {
    jobid: 'job-67890-volume',
    id: 'job-67890-volume',
    volume: {
      id: 'volume-new-456',
      name: 'data-volume-02',
      zoneid: 'zone-1',
      zonename: 'Primary Zone',
      type: 'DATADISK',
      size: 107374182400, // 100GB
      created: '2024-06-18T12:05:00+0000',
      state: 'Allocated',
      account: 'admin',
      domainid: '1',
      domain: 'ROOT',
      storagetype: 'shared',
      diskofferingid: 'disk-offering-2',
      diskofferingname: 'Large Disk'
    }
  }
};

export const mockCreateSnapshotResponse = {
  createsnapshotresponse: {
    jobid: 'job-24680-snapshot',
    id: 'job-24680-snapshot',
    snapshot: {
      id: 'snapshot-new-789',
      name: 'backup-snapshot-01',
      created: '2024-06-18T12:10:00+0000',
      account: 'admin',
      domainid: '1',
      domain: 'ROOT',
      intervaltype: 'MANUAL',
      snapshottype: 'MANUAL',
      volumeid: 'volume-123',
      volumename: 'data-volume-01',
      volumetype: 'DATADISK',
      state: 'CreatedOnPrimary',
      physicalsize: 10737418240 // 10GB
    }
  }
};

export const mockCreateSecurityGroupResponse = {
  createsecuritygroupresponse: {
    securitygroup: {
      id: 'sg-new-123',
      name: 'web-servers',
      description: 'Security group for web servers',
      account: 'admin',
      domainid: '1',
      domain: 'ROOT',
      ingressrule: [],
      egressrule: []
    }
  }
};

export const mockAsyncJobResponse = {
  startvirtualmachineresponse: {
    jobid: 'job-async-456',
    id: 'job-async-456'
  }
};

export const mockUpdateVMResponse = {
  updatevirtualmachineresponse: {
    virtualmachine: {
      id: 'vm-12345',
      name: 'web-server-01',
      displayname: 'Updated Web Server',
      account: 'admin',
      domainid: '1',
      domain: 'ROOT',
      state: 'Running',
      haenable: true,
      hypervisor: 'KVM',
      instancename: 'i-2-123-VM',
      templateid: 'template-456',
      templatename: 'Ubuntu 22.04',
      serviceofferingid: 'offering-789',
      serviceofferingname: 'Medium Instance',
      cpunumber: 2,
      cpuspeed: 2000,
      memory: 4096,
      zoneid: 'zone-1',
      zonename: 'Primary Zone'
    }
  }
};

export const mockAttachVolumeResponse = {
  attachvolumeresponse: {
    jobid: 'job-attach-789',
    id: 'job-attach-789',
    volume: {
      id: 'volume-456',
      name: 'data-volume-01',
      zoneid: 'zone-1',
      zonename: 'Primary Zone',
      type: 'DATADISK',
      deviceid: 1,
      virtualmachineid: 'vm-12345',
      vmname: 'web-server-01',
      vmstate: 'Running',
      size: 107374182400,
      state: 'Ready',
      account: 'admin',
      domainid: '1',
      domain: 'ROOT',
      storagetype: 'shared'
    }
  }
};

export const mockSecurityGroupRuleResponse = {
  authorizesecuritygroupingressresponse: {
    jobid: 'job-rule-101',
    id: 'job-rule-101',
    securitygroup: {
      id: 'sg-123',
      name: 'web-servers',
      description: 'Security group for web servers',
      account: 'admin',
      domainid: '1',
      domain: 'ROOT',
      ingressrule: [
        {
          ruleid: 'rule-new-456',
          protocol: 'TCP',
          startport: 80,
          endport: 80,
          cidr: '0.0.0.0/0',
          account: 'admin',
          securitygroupname: 'web-servers'
        }
      ],
      egressrule: []
    }
  }
};

export const mockManagementErrorResponse = {
  errorcode: 432,
  errortext: 'Insufficient capacity available for requested resources',
  cserrorcode: 4350,
  uuidList: []
};

export const mockJobStatusResponse = {
  queryasyncjobresultresponse: {
    jobid: 'job-12345',
    jobstatus: 1,
    jobprocstatus: 0,
    jobresultcode: 0,
    jobresulttype: 'object',
    jobresult: {
      virtualmachine: {
        id: 'vm-12345',
        name: 'test-vm',
        state: 'Running'
      }
    },
    created: '2024-06-18T12:00:00+0000',
    completed: '2024-06-18T12:02:30+0000'
  }
};