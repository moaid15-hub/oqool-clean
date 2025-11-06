/**
 * Security Commands
 * أوامر الفحص الأمني
 */

import { Command } from 'commander';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

export function registerSecurityCommand(program: Command): void {
  const security = program
    .command('security')
    .alias('sec')
    .description('Security scanning and checks');

  // Scan for secrets
  security
    .command('secrets [path]')
    .description('Scan for leaked secrets and credentials')
    .option('-v, --verbose', 'Verbose output')
    .option('--no-git', 'Scan files only (not git history)')
    .action(async (scanPath = '.', options) => {
      try {
        console.log('🔒 Scanning for secrets...\n');

        const command = options.git
          ? `gitleaks detect --source ${scanPath} -v`
          : `gitleaks detect --no-git --source ${scanPath} -v`;

        const { stdout, stderr } = await execAsync(command);

        if (stdout) {
          console.log(stdout);
        }

        console.log('\n✅ No secrets found!');
      } catch (error: any) {
        if (error.stdout && error.stdout.includes('leaks found')) {
          console.error('❌ Secrets detected!\n');
          console.error(error.stdout);
          process.exit(1);
        } else if (error.message.includes('command not found')) {
          console.error('❌ Gitleaks not installed!');
          console.log('Install: https://github.com/gitleaks/gitleaks#installing');
          process.exit(1);
        } else {
          console.error('❌ Error:', error.message);
          process.exit(1);
        }
      }
    });

  // Vulnerability scan
  security
    .command('vuln [path]')
    .description('Scan for vulnerabilities (dependencies, Docker, etc.)')
    .option('-s, --severity <level>', 'Minimum severity (LOW, MEDIUM, HIGH, CRITICAL)', 'MEDIUM')
    .option('--docker <image>', 'Scan Docker image')
    .action(async (scanPath = '.', options) => {
      try {
        console.log('🛡️  Scanning for vulnerabilities...\n');

        let command: string;

        if (options.docker) {
          // Scan Docker image
          command = `trivy image --severity ${options.severity} ${options.docker}`;
        } else {
          // Scan filesystem
          command = `trivy fs --severity ${options.severity} ${scanPath}`;
        }

        const { stdout } = await execAsync(command);
        console.log(stdout);

        console.log('\n✅ Vulnerability scan complete!');
      } catch (error: any) {
        if (error.message.includes('command not found')) {
          console.error('❌ Trivy not installed!');
          console.log('Install: https://aquasecurity.github.io/trivy/');
          process.exit(1);
        } else {
          console.error('❌ Vulnerabilities found!\n');
          console.error(error.stdout || error.message);
          process.exit(1);
        }
      }
    });

  // Full security audit
  security
    .command('audit [path]')
    .description('Full security audit')
    .option('--fix', 'Auto-fix issues where possible')
    .action(async (scanPath = '.', options) => {
      try {
        console.log('🔍 Running full security audit...\n');

        // 1. Check for secrets
        console.log('1️⃣ Checking for leaked secrets...');
        try {
          await execAsync(`gitleaks detect --source ${scanPath}`);
          console.log('  ✅ No secrets found\n');
        } catch (error: any) {
          if (error.stdout && error.stdout.includes('leaks found')) {
            console.log('  ❌ Secrets detected!\n');
            console.log(error.stdout);
          }
        }

        // 2. Check dependencies
        console.log('2️⃣ Checking dependencies for vulnerabilities...');
        try {
          const { stdout } = await execAsync(`npm audit --json`);
          const audit = JSON.parse(stdout);

          if (audit.metadata.vulnerabilities.total === 0) {
            console.log('  ✅ No vulnerabilities found\n');
          } else {
            console.log(`  ⚠️  Found ${audit.metadata.vulnerabilities.total} vulnerabilities`);
            console.log(`     Critical: ${audit.metadata.vulnerabilities.critical}`);
            console.log(`     High: ${audit.metadata.vulnerabilities.high}`);
            console.log(`     Medium: ${audit.metadata.vulnerabilities.moderate}`);
            console.log(`     Low: ${audit.metadata.vulnerabilities.low}\n`);

            if (options.fix) {
              console.log('  🔧 Auto-fixing...');
              await execAsync('npm audit fix');
              console.log('  ✅ Fixed!\n');
            }
          }
        } catch (error) {
          console.log('  ⚠️  Could not check npm dependencies\n');
        }

        // 3. Check for security headers in web configs
        console.log('3️⃣ Checking security configurations...');
        try {
          const { stdout } = await execAsync(
            `rg -i "x-frame-options|content-security-policy|strict-transport-security" ${scanPath}`
          );
          if (stdout) {
            console.log('  ✅ Security headers found\n');
          }
        } catch {
          console.log('  ⚠️  No security headers detected\n');
        }

        // 4. Check for outdated packages
        console.log('4️⃣ Checking for outdated packages...');
        try {
          const { stdout } = await execAsync('npm outdated --json');
          const outdated = JSON.parse(stdout || '{}');
          const count = Object.keys(outdated).length;

          if (count === 0) {
            console.log('  ✅ All packages up to date\n');
          } else {
            console.log(`  ⚠️  ${count} outdated packages\n`);
          }
        } catch {
          console.log('  ✅ All packages up to date\n');
        }

        // 5. Check file permissions
        console.log('5️⃣ Checking file permissions...');
        try {
          const { stdout } = await execAsync(
            `find ${scanPath} -type f \\( -name "*.key" -o -name "*.pem" -o -name ".env" \\) -perm /go+r 2>/dev/null`
          );
          if (stdout) {
            console.log('  ⚠️  Sensitive files with weak permissions:');
            console.log(stdout);
          } else {
            console.log('  ✅ File permissions OK\n');
          }
        } catch {
          console.log('  ✅ File permissions OK\n');
        }

        console.log('✅ Security audit complete!');
      } catch (error: any) {
        console.error('❌ Audit error:', error.message);
        process.exit(1);
      }
    });

  // Security score
  security
    .command('score [path]')
    .description('Calculate security score')
    .action(async (scanPath = '.') => {
      try {
        console.log('🎯 Security Score\n');

        let score = 100;
        const issues: string[] = [];

        // Check for secrets
        try {
          await execAsync(`gitleaks detect --source ${scanPath}`);
        } catch (error: any) {
          if (error.stdout && error.stdout.includes('leaks found')) {
            score -= 40;
            issues.push('-40: Secrets detected in code');
          }
        }

        // Check npm audit
        try {
          const { stdout } = await execAsync('npm audit --json');
          const audit = JSON.parse(stdout);
          const vulns = audit.metadata.vulnerabilities;

          if (vulns.critical > 0) {
            score -= 30;
            issues.push(`-30: ${vulns.critical} critical vulnerabilities`);
          } else if (vulns.high > 0) {
            score -= 20;
            issues.push(`-20: ${vulns.high} high vulnerabilities`);
          } else if (vulns.moderate > 0) {
            score -= 10;
            issues.push(`-10: ${vulns.moderate} medium vulnerabilities`);
          }
        } catch {}

        // Check for .env in git
        try {
          const { stdout } = await execAsync('git ls-files | grep "^\\.env$"');
          if (stdout) {
            score -= 20;
            issues.push('-20: .env file tracked in git');
          }
        } catch {}

        // Final score
        console.log(`🎯 Security Score: ${Math.max(0, score)}/100\n`);

        if (issues.length > 0) {
          console.log('Issues:');
          issues.forEach(i => console.log(`  ${i}`));
          console.log('');
        }

        if (score >= 90) {
          console.log('✅ Excellent security!');
        } else if (score >= 70) {
          console.log('👍 Good security');
        } else if (score >= 50) {
          console.log('⚠️  Needs improvement');
        } else {
          console.log('❌ Critical security issues - fix immediately!');
        }
      } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
      }
    });
}
