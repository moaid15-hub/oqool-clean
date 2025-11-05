/**
 * Code Statistics Command
 * أوامر إحصائيات الكود باستخدام tokei
 */

import { Command } from 'commander';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export function registerStatsCommand(program: Command): void {
  const stats = program
    .command('stats')
    .description('Code statistics and insights');

  // Overall stats
  stats
    .command('overview [path]')
    .description('Project overview statistics')
    .option('-f, --format <format>', 'Output format (table, json, yaml)', 'table')
    .action(async (path = '.', options) => {
      try {
        const format = options.format === 'table' ? '' : `-o ${options.format}`;
        const { stdout } = await execAsync(`tokei ${format} ${path}`);

        console.log(stdout);
      } catch (error: any) {
        console.error('❌ Error:', error.message);
        console.log('\n💡 Hint: Install tokei with: cargo install tokei');
        process.exit(1);
      }
    });

  // Language breakdown
  stats
    .command('languages [path]')
    .description('Language breakdown')
    .action(async (path = '.') => {
      try {
        const { stdout } = await execAsync(`tokei -s lines ${path}`);
        console.log('📊 Language Breakdown:\n');
        console.log(stdout);
      } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
      }
    });

  // File types
  stats
    .command('files [path]')
    .description('File type statistics')
    .option('-e, --ext <extensions...>', 'Filter by extensions')
    .action(async (path = '.', options) => {
      try {
        let command = `fd -t f ${path}`;

        if (options.ext && options.ext.length > 0) {
          const exts = options.ext.map((e: string) => `-e ${e}`).join(' ');
          command = `fd -t f ${exts} ${path}`;
        }

        const { stdout } = await execAsync(`${command} | wc -l`);
        const fileCount = stdout.trim();

        console.log(`📁 Total files: ${fileCount}`);

        // Breakdown by extension
        const { stdout: breakdown } = await execAsync(
          `fd -t f ${path} -x echo {/} | sed 's/.*\\.//g' | sort | uniq -c | sort -rn | head -20`
        );

        console.log('\n📊 Top file types:\n');
        console.log(breakdown);
      } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
      }
    });

  // Project health
  stats
    .command('health [path]')
    .description('Project health metrics')
    .action(async (path = '.') => {
      try {
        console.log('🏥 Project Health Report\n');

        // Code statistics
        console.log('📊 Code Statistics:');
        const { stdout: tokeiStats } = await execAsync(`tokei ${path} -o json`);
        const stats = JSON.parse(tokeiStats);

        let totalLines = 0;
        let totalCode = 0;
        let totalComments = 0;

        for (const [lang, data] of Object.entries(stats)) {
          if (lang !== 'Total') {
            const langData = data as any;
            totalLines += langData.lines || 0;
            totalCode += langData.code || 0;
            totalComments += langData.comments || 0;
          }
        }

        console.log(`  Lines: ${totalLines.toLocaleString()}`);
        console.log(`  Code: ${totalCode.toLocaleString()}`);
        console.log(`  Comments: ${totalComments.toLocaleString()}`);
        console.log(`  Comment ratio: ${((totalComments / totalCode) * 100).toFixed(1)}%`);

        // Test coverage (if available)
        console.log('\n🧪 Test Coverage:');
        try {
          const { stdout: testFiles } = await execAsync(
            `fd -e test.ts -e spec.ts ${path} | wc -l`
          );
          console.log(`  Test files: ${testFiles.trim()}`);
        } catch {
          console.log('  Test files: N/A');
        }

        // TODO/FIXME count
        console.log('\n⚠️  Technical Debt:');
        try {
          const { stdout: todos } = await execAsync(
            `rg -i "TODO|FIXME|HACK|XXX" ${path} | wc -l`
          );
          console.log(`  TODOs/FIXMEs: ${todos.trim()}`);
        } catch {
          console.log('  TODOs/FIXMEs: 0');
        }

        // Dependencies
        console.log('\n📦 Dependencies:');
        try {
          if (await fileExists(`${path}/package.json`)) {
            const { stdout: deps } = await execAsync(
              `cat ${path}/package.json | jq '.dependencies | length'`
            );
            const { stdout: devDeps } = await execAsync(
              `cat ${path}/package.json | jq '.devDependencies | length'`
            );
            console.log(`  Runtime: ${deps.trim()}`);
            console.log(`  Dev: ${devDeps.trim()}`);
          }
        } catch {
          console.log('  N/A');
        }

        console.log('\n✅ Health check complete!');
      } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
      }
    });

  // Code quality score
  stats
    .command('score [path]')
    .description('Calculate code quality score')
    .action(async (path = '.') => {
      try {
        console.log('🎯 Code Quality Score\n');

        let score = 100;
        const factors: string[] = [];

        // Get stats
        const { stdout: tokeiStats } = await execAsync(`tokei ${path} -o json`);
        const stats = JSON.parse(tokeiStats);

        let totalCode = 0;
        let totalComments = 0;

        for (const [lang, data] of Object.entries(stats)) {
          if (lang !== 'Total') {
            const langData = data as any;
            totalCode += langData.code || 0;
            totalComments += langData.comments || 0;
          }
        }

        // Comment ratio (target: 15-25%)
        const commentRatio = (totalComments / totalCode) * 100;
        if (commentRatio < 10) {
          score -= 20;
          factors.push('-20: Low comment ratio');
        } else if (commentRatio > 40) {
          score -= 10;
          factors.push('-10: Over-commented');
        } else {
          factors.push('+0: Good comment ratio');
        }

        // TODOs/FIXMEs
        try {
          const { stdout: todos } = await execAsync(
            `rg -i "TODO|FIXME|HACK" ${path} | wc -l`
          );
          const todoCount = parseInt(todos.trim());
          if (todoCount > 50) {
            score -= 15;
            factors.push(`-15: High technical debt (${todoCount} TODOs)`);
          } else if (todoCount > 20) {
            score -= 5;
            factors.push(`-5: Moderate technical debt (${todoCount} TODOs)`);
          }
        } catch {}

        // Tests
        try {
          const { stdout: testFiles } = await execAsync(
            `fd -e test.ts -e spec.ts ${path} | wc -l`
          );
          const testCount = parseInt(testFiles.trim());
          if (testCount === 0) {
            score -= 30;
            factors.push('-30: No tests found');
          } else if (testCount < 10) {
            score -= 15;
            factors.push('-15: Few tests');
          }
        } catch {}

        // Final score
        console.log(`📊 Final Score: ${Math.max(0, score)}/100\n`);
        console.log('Factors:');
        factors.forEach(f => console.log(`  ${f}`));

        console.log('\n');
        if (score >= 80) {
          console.log('✅ Excellent code quality!');
        } else if (score >= 60) {
          console.log('👍 Good code quality');
        } else if (score >= 40) {
          console.log('⚠️  Needs improvement');
        } else {
          console.log('❌ Poor code quality - action needed');
        }
      } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
      }
    });
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await execAsync(`test -f ${path}`);
    return true;
  } catch {
    return false;
  }
}
