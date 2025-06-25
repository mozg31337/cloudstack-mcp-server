# CloudStack MCP Server - Security Operations Manual

## Overview

This manual provides operational procedures for maintaining the security of the CloudStack MCP Server in production environments. It covers daily operations, incident response, and security maintenance tasks.

## Daily Operations

### Security Health Checks

#### Morning Security Review (10 minutes)
1. **Check Audit Logs**
   ```bash
   # Review overnight security events
   tail -100 logs/security/security.log | grep -E "(CRITICAL|HIGH)"
   
   # Check for failed authentication attempts
   grep "authentication.*failure" logs/security/audit.log | tail -20
   
   # Review rate limit violations
   grep "rate_limit_exceeded" logs/security/audit.log | tail -10
   ```

2. **Verify System Status**
   ```bash
   # Check file permissions
   ls -la config/
   # Should show: -rw------- for config files
   
   # Verify log file permissions
   ls -la logs/security/
   # Should show: -rw-r----- for log files
   ```

3. **Monitor Resource Usage**
   ```bash
   # Check memory usage
   ps aux | grep cloudstack-mcp-server
   
   # Check log file sizes
   du -sh logs/
   ```

#### Security Dashboard Review (5 minutes)
- Review automated security reports
- Check monitoring alerts and thresholds
- Validate backup status
- Confirm credential rotation schedules

### Weekly Security Tasks

#### Security Report Generation
```bash
# Generate weekly security report
node -e "
const { SecurityAuditLogger } = require('./dist/security/SecurityAuditLogger.js');
const logger = new SecurityAuditLogger();
const endTime = Date.now();
const startTime = endTime - (7 * 24 * 60 * 60 * 1000); // 7 days ago
const report = logger.generateSecurityReport(startTime, endTime);
console.log(JSON.stringify(report, null, 2));
" > reports/weekly-security-$(date +%Y%m%d).json
```

#### Log Cleanup and Archival
```bash
# Archive old audit logs (keep 90 days)
find logs/security/ -name "*.log" -mtime +90 -exec gzip {} \;
find logs/security/ -name "*.gz" -mtime +365 -delete

# Clean up old security reports
find reports/ -name "*.json" -mtime +180 -delete
```

#### Dependency Security Check
```bash
# Check for known vulnerabilities
npm audit
npm audit fix

# Update security-related dependencies
npm update zod winston axios
```

### Monthly Security Tasks

#### Credential Rotation
```bash
# Rotate CloudStack API credentials
# 1. Generate new credentials in CloudStack UI
# 2. Update configuration
node -e "
const { ConfigManager } = require('./dist/utils/config.js');
const config = new ConfigManager();
config.rotateEnvironmentCredentials('production').then(success => {
  console.log('Credential rotation:', success ? 'SUCCESS' : 'FAILED');
});
"

# 3. Verify new credentials work
node -e "
const { ConfigManager } = require('./dist/utils/config.js');
const config = new ConfigManager();
config.validateEnvironmentCredentials('production').then(valid => {
  console.log('Credential validation:', valid ? 'VALID' : 'INVALID');
});
"
```

#### Security Assessment
1. **Review Security Metrics**
   - Failed authentication rate
   - Rate limit violations
   - Security event trends
   - Response times

2. **Update Security Controls**
   - Review and update input validation schemas
   - Adjust rate limiting thresholds
   - Update threat detection rules
   - Verify monitoring coverage

3. **Security Training Review**
   - Update security procedures
   - Review incident response plans
   - Conduct security awareness training

## Incident Response

### Severity Classification

#### CRITICAL (Response: Immediate)
- Active security breach or compromise
- Credential theft or unauthorized access
- System compromise or malware detection
- Data exfiltration or corruption

#### HIGH (Response: Within 1 hour)
- Multiple failed authentication attempts
- Privilege escalation attempts
- Suspicious administrative actions
- Security control failures

#### MEDIUM (Response: Within 4 hours)
- Rate limiting violations
- Input validation failures
- Configuration security warnings
- Audit log anomalies

#### LOW (Response: Within 24 hours)
- Security policy violations
- Minor configuration issues
- Performance-related security impacts

### Incident Response Procedures

#### Phase 1: Detection and Analysis (15 minutes)
1. **Initial Assessment**
   ```bash
   # Check current security events
   tail -50 logs/security/security.log
   
   # Look for correlation patterns
   grep "correlationId" logs/security/audit.log | tail -20
   
   # Check system status
   systemctl status cloudstack-mcp-server
   ps aux | grep cloudstack-mcp-server
   ```

2. **Gather Evidence**
   ```bash
   # Export recent audit logs
   node -e "
   const { SecurityAuditLogger } = require('./dist/security/SecurityAuditLogger.js');
   const logger = new SecurityAuditLogger();
   const now = Date.now();
   const startTime = now - (2 * 60 * 60 * 1000); // Last 2 hours
   logger.exportAuditLog('incident-logs-' + Date.now() + '.json', startTime, now);
   "
   
   # Copy configuration for analysis
   cp config/cloudstack.json incident-config-backup-$(date +%Y%m%d-%H%M%S).json
   ```

3. **Impact Assessment**
   - Identify affected systems and users
   - Determine scope of potential compromise
   - Assess data exposure risk
   - Evaluate business impact

#### Phase 2: Containment (30 minutes)
1. **Immediate Containment**
   ```bash
   # Stop the service if compromise suspected
   systemctl stop cloudstack-mcp-server
   
   # Block suspicious IP addresses (example)
   iptables -A INPUT -s SUSPICIOUS_IP -j DROP
   
   # Disable compromised user accounts
   # (Update configuration to remove access)
   ```

2. **Preserve Evidence**
   ```bash
   # Create forensic copy of logs
   cp -r logs/ forensic-logs-$(date +%Y%m%d-%H%M%S)/
   
   # Document system state
   ps aux > system-state-$(date +%Y%m%d-%H%M%S).txt
   netstat -an > network-state-$(date +%Y%m%d-%H%M%S).txt
   ```

3. **Communication**
   - Notify security team and management
   - Document incident timeline
   - Prepare stakeholder communications

#### Phase 3: Eradication (1-2 hours)
1. **Root Cause Analysis**
   - Review audit logs for attack vectors
   - Analyze security control failures
   - Identify vulnerability exploited
   - Document attack timeline

2. **Remove Threats**
   ```bash
   # Update credentials if compromised
   # Generate new API keys in CloudStack
   
   # Update configuration with new credentials
   # Use encrypted configuration storage
   
   # Update input validation if bypass found
   # Review and strengthen validation schemas
   ```

3. **Patch Vulnerabilities**
   ```bash
   # Update dependencies
   npm update
   npm audit fix
   
   # Apply security patches
   git pull origin main
   npm run build
   ```

#### Phase 4: Recovery (30 minutes)
1. **Restore Services**
   ```bash
   # Verify configuration security
   node -e "
   const { ConfigManager } = require('./dist/utils/config.js');
   const config = new ConfigManager();
   console.log('Config validation successful');
   "
   
   # Test security controls
   npm test -- tests/security/
   
   # Start service with monitoring
   systemctl start cloudstack-mcp-server
   systemctl status cloudstack-mcp-server
   ```

2. **Verify Functionality**
   ```bash
   # Test basic functionality
   # Use Claude to run a simple operation
   
   # Check security logging
   tail -f logs/security/audit.log
   ```

3. **Enhanced Monitoring**
   - Increase logging verbosity temporarily
   - Add additional monitoring for affected areas
   - Schedule follow-up security checks

#### Phase 5: Lessons Learned (1 week later)
1. **Post-Incident Review**
   - Document what happened and why
   - Identify security control gaps
   - Review response effectiveness
   - Gather team feedback

2. **Improve Security**
   - Update security procedures
   - Enhance monitoring and detection
   - Implement additional controls
   - Update incident response plan

### Common Incident Scenarios

#### Scenario 1: Credential Compromise
**Indicators**: Unexpected API calls, authentication from unknown locations
**Response**:
1. Immediately rotate all CloudStack credentials
2. Review audit logs for unauthorized actions
3. Update security group rules if needed
4. Implement additional authentication factors

#### Scenario 2: Input Validation Bypass
**Indicators**: Security warnings in logs, unexpected parameter values
**Response**:
1. Stop the service immediately
2. Review and fix validation schemas
3. Test fix thoroughly in staging
4. Deploy fix and resume service

#### Scenario 3: Rate Limiting Abuse
**Indicators**: High rate limit violations, performance degradation
**Response**:
1. Identify source of abuse
2. Block malicious clients
3. Adjust rate limiting thresholds
4. Implement additional DoS protection

#### Scenario 4: Configuration Exposure
**Indicators**: Configuration file access, credential leakage
**Response**:
1. Rotate all exposed credentials
2. Fix file permissions
3. Move to encrypted configuration
4. Review access controls

## Security Monitoring

### Key Metrics to Monitor

#### Authentication Metrics
- Failed authentication rate (threshold: >10/hour)
- Successful authentication rate
- Authentication response time
- Unique user count per day

#### Authorization Metrics
- Authorization denial rate (threshold: >5/hour)
- Privilege escalation attempts
- Cross-environment access attempts
- Administrative action frequency

#### API Security Metrics
- Input validation failure rate (threshold: >20/hour)
- Rate limit violation rate (threshold: >5/hour)
- Suspicious pattern detection rate
- API response time (security overhead)

#### System Security Metrics
- Configuration file access attempts
- Log file integrity checks
- Memory usage patterns
- Network connection patterns

### Monitoring Setup

#### Log Monitoring
```bash
# Set up log monitoring with appropriate tools
# Example: Configure log aggregation system

# Monitor critical security events
tail -f logs/security/security.log | grep -E "(CRITICAL|HIGH)" | \
while read line; do
  echo "ALERT: $line" | mail -s "Security Alert" security@company.com
done
```

#### Automated Alerting
```json
{
  "alerts": [
    {
      "name": "Critical Security Event",
      "condition": "severity == 'CRITICAL'",
      "action": "immediate_notification",
      "recipients": ["security-team@company.com"]
    },
    {
      "name": "High Failed Authentication Rate",
      "condition": "failed_auth_rate > 10/hour",
      "action": "investigation_required",
      "recipients": ["ops-team@company.com"]
    },
    {
      "name": "Rate Limit Violations",
      "condition": "rate_limit_violations > 5/hour",
      "action": "review_required",
      "recipients": ["dev-team@company.com"]
    }
  ]
}
```

### Performance Monitoring
```bash
# Monitor security overhead
time npm test -- tests/security/

# Check memory usage of security components
node -e "
const { ValidationMiddleware } = require('./dist/security/ValidationMiddleware.js');
const middleware = new ValidationMiddleware();
console.log('Memory usage:', process.memoryUsage());
"
```

## Security Maintenance

### Regular Maintenance Tasks

#### Weekly Tasks
- [ ] Review security audit logs
- [ ] Check for dependency updates
- [ ] Verify backup integrity
- [ ] Test incident response procedures
- [ ] Update security documentation

#### Monthly Tasks
- [ ] Rotate credentials
- [ ] Security control assessment
- [ ] Update threat detection rules
- [ ] Review access permissions
- [ ] Conduct security training

#### Quarterly Tasks
- [ ] Comprehensive security audit
- [ ] Penetration testing
- [ ] Security architecture review
- [ ] Incident response plan update
- [ ] Compliance assessment

#### Annual Tasks
- [ ] Full security assessment
- [ ] Security policy review
- [ ] Disaster recovery testing
- [ ] Security awareness training
- [ ] Third-party security audit

### Configuration Management

#### Secure Configuration Updates
```bash
# 1. Backup current configuration
cp config/cloudstack.json config/backup/cloudstack-$(date +%Y%m%d).json

# 2. Validate new configuration
node -e "
const { ConfigManager } = require('./dist/utils/config.js');
const config = new ConfigManager('config/new-config.json');
console.log('Configuration validation successful');
"

# 3. Apply configuration update
mv config/new-config.json config/cloudstack.json
systemctl restart cloudstack-mcp-server

# 4. Verify functionality
# Test with Claude Desktop

# 5. Monitor for issues
tail -f logs/security/audit.log
```

#### Configuration Security Checklist
- [ ] Use encrypted configuration in production
- [ ] Set file permissions to 600
- [ ] Store sensitive data in environment variables
- [ ] Implement configuration validation
- [ ] Enable configuration change auditing
- [ ] Test configuration in staging first
- [ ] Document all configuration changes
- [ ] Maintain configuration backups

### Emergency Procedures

#### Security Breach Response
1. **Immediate Actions** (0-15 minutes)
   - Stop the service
   - Preserve evidence
   - Notify security team
   - Begin containment

2. **Assessment** (15-60 minutes)
   - Determine scope of breach
   - Identify compromised systems
   - Assess data exposure
   - Document timeline

3. **Recovery** (1-4 hours)
   - Implement security fixes
   - Restore from clean backups
   - Test all functionality
   - Resume operations

4. **Follow-up** (24-48 hours)
   - Complete investigation
   - Update security controls
   - Communicate with stakeholders
   - Document lessons learned

#### Communication Templates

##### Security Alert Email
```
Subject: [URGENT] CloudStack MCP Server Security Alert

A security event has been detected in the CloudStack MCP Server:

Incident ID: INC-$(date +%Y%m%d-%H%M%S)
Severity: [CRITICAL/HIGH/MEDIUM/LOW]
Detection Time: $(date)
Affected Systems: [List systems]

Initial Assessment:
[Brief description of the incident]

Actions Taken:
- [List immediate actions]

Next Steps:
- [List planned actions]

Estimated Resolution: [Time estimate]

Security Team Contact: security@company.com
```

##### All-Clear Notification
```
Subject: [RESOLVED] CloudStack MCP Server Security Incident

The security incident INC-$(date +%Y%m%d-%H%M%S) has been resolved.

Resolution Summary:
- Root cause identified and fixed
- All systems restored to normal operation
- Additional monitoring implemented
- Security controls enhanced

Timeline:
- Detection: [Time]
- Containment: [Time]
- Resolution: [Time]
- Total Duration: [Duration]

No data was compromised during this incident.

For questions, contact: security@company.com
```

## Compliance and Reporting

### Security Compliance
- Document all security procedures
- Maintain audit trail for all changes
- Regular compliance assessments
- Third-party security validation
- Continuous improvement process

### Reporting Schedule
- **Daily**: Security event summary
- **Weekly**: Detailed security report
- **Monthly**: Security metrics and trends
- **Quarterly**: Compliance assessment
- **Annual**: Comprehensive security review

---

This operations manual ensures consistent security procedures and rapid response to security incidents. Regular review and updates maintain effectiveness against evolving threats.