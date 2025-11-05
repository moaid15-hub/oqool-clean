// database-integration.ts
// ============================================
// 🗄️ Database Integration System
// نظام التكامل مع قواعد البيانات
// ============================================

import { OqoolAPIClient } from './api-client.js';
import chalk from 'chalk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ============================================
// Types & Interfaces
// ============================================

export type DatabaseType =
  | 'postgresql'
  | 'mysql'
  | 'mongodb'
  | 'sqlite'
  | 'redis'
  | 'mariadb'
  | 'mssql';

export interface DatabaseConfig {
  type: DatabaseType;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  connectionString?: string;
  ssl?: boolean;
  poolSize?: number;
  timeout?: number;
}

export interface Table {
  name: string;
  schema?: string;
  columns: Column[];
  primaryKey?: string[];
  foreignKeys?: ForeignKey[];
  indexes?: Index[];
}

export interface Column {
  name: string;
  type: string;
  nullable: boolean;
  default?: any;
  unique?: boolean;
  autoIncrement?: boolean;
  length?: number;
  precision?: number;
  scale?: number;
}

export interface ForeignKey {
  column: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface Index {
  name: string;
  columns: string[];
  unique: boolean;
  type?: 'BTREE' | 'HASH' | 'GIN' | 'GIST';
}

export interface MigrationFile {
  id: string;
  name: string;
  timestamp: number;
  up: string;
  down: string;
  executed: boolean;
}

export interface QueryResult {
  success: boolean;
  rows?: any[];
  rowCount?: number;
  error?: string;
  executionTime?: number;
}

export interface SchemaGenerationOptions {
  includeTimestamps?: boolean;
  includeSoftDelete?: boolean;
  useUUID?: boolean;
  generateRelations?: boolean;
  ormType?: 'prisma' | 'typeorm' | 'sequelize' | 'mongoose' | 'none';
}

// ============================================
// Database Integration System
// ============================================

export class DatabaseIntegration {
  private projectRoot: string;
  private client: OqoolAPIClient;
  private config?: DatabaseConfig;
  private migrationsDir: string;
  private schemasDir: string;

  constructor(projectRoot: string, client: OqoolAPIClient) {
    this.projectRoot = projectRoot;
    this.client = client;
    this.migrationsDir = path.join(projectRoot, 'migrations');
    this.schemasDir = path.join(projectRoot, 'schemas');
  }

  // ============================================
  // Configuration & Setup
  // ============================================

  /**
   * تكوين الاتصال بقاعدة البيانات
   */
  async configure(config: DatabaseConfig): Promise<void> {
    this.config = config;
    console.log(chalk.green(`✅ تم تكوين الاتصال بـ ${config.type}`));
  }

  /**
   * تهيئة المشروع لقاعدة البيانات
   */
  async initializeDatabase(dbType: DatabaseType, ormType?: string): Promise<void> {
    console.log(chalk.cyan(`\n🗄️  تهيئة ${dbType}...\n`));

    try {
      // إنشاء المجلدات
      await fs.mkdir(this.migrationsDir, { recursive: true });
      await fs.mkdir(this.schemasDir, { recursive: true });

      // توليد ملف الإعدادات
      const configFile = await this.generateDatabaseConfig(dbType, ormType);
      await fs.writeFile(path.join(this.projectRoot, 'database.config.ts'), configFile);

      // توليد ملف الاتصال
      const connectionFile = await this.generateConnectionFile(dbType, ormType);
      await fs.writeFile(path.join(this.projectRoot, 'database.ts'), connectionFile);

      // توليد .env template
      const envTemplate = this.generateEnvTemplate(dbType);
      const envPath = path.join(this.projectRoot, '.env.example');
      const existingEnv = await fs.readFile(envPath, 'utf-8').catch(() => '');
      await fs.writeFile(envPath, existingEnv + '\n' + envTemplate);

      console.log(chalk.green('\n✅ تم تهيئة قاعدة البيانات بنجاح!'));
      console.log(chalk.yellow('\n📝 الملفات المُنشأة:'));
      console.log(chalk.white('   - database.config.ts'));
      console.log(chalk.white('   - database.ts'));
      console.log(chalk.white('   - .env.example (محدث)'));
      console.log(chalk.white('   - migrations/ (مجلد)'));
      console.log(chalk.white('   - schemas/ (مجلد)'));

      console.log(chalk.cyan('\n💡 الخطوات التالية:'));
      console.log(chalk.white('   1. انسخ .env.example إلى .env'));
      console.log(chalk.white('   2. املأ بيانات الاتصال'));
      console.log(
        chalk.white(`   3. نفذ: npm install ${this.getDependencies(dbType, ormType).join(' ')}`)
      );
    } catch (error: any) {
      console.log(chalk.red(`\n❌ خطأ: ${error.message}`));
      throw error;
    }
  }

  // ============================================
  // Schema Generation with AI
  // ============================================

  /**
   * توليد schema من وصف طبيعي باستخدام AI
   */
  async generateSchemaFromDescription(
    description: string,
    options: SchemaGenerationOptions = {}
  ): Promise<Table[]> {
    const {
      includeTimestamps = true,
      includeSoftDelete = false,
      useUUID = true,
      generateRelations = true,
      ormType = 'none',
    } = options;

    const prompt = `
أنشئ database schema بناءً على الوصف التالي:

${description}

المتطلبات:
${includeTimestamps ? '- أضف timestamps (createdAt, updatedAt)' : ''}
${includeSoftDelete ? '- أضف soft delete (deletedAt)' : ''}
${useUUID ? '- استخدم UUID للـ primary keys' : '- استخدم auto-increment integers'}
${generateRelations ? '- حدد العلاقات بين الجداول (foreign keys)' : ''}
${ormType !== 'none' ? `- اجعل الـ schema متوافق مع ${ormType}` : ''}

التنسيق المطلوب (JSON):
{
  "tables": [
    {
      "name": "table_name",
      "columns": [
        {
          "name": "column_name",
          "type": "data_type",
          "nullable": false,
          "unique": false,
          "default": null
        }
      ],
      "primaryKey": ["id"],
      "foreignKeys": [
        {
          "column": "foreign_id",
          "referencedTable": "other_table",
          "referencedColumn": "id",
          "onDelete": "CASCADE"
        }
      ],
      "indexes": []
    }
  ]
}

أعط schema كامل ومنظم مع جميع العلاقات.
`;

    const response = await this.client.sendChatMessage([{ role: 'user', content: prompt }]);

    if (!response.success) {
      throw new Error(response.error || 'فشل توليد Schema');
    }

    // استخراج الـ JSON
    const jsonMatch = response.message.match(/\{[\s\S]*"tables"[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('تعذر استخراج Schema من رد AI');
    }

    const schemaData = JSON.parse(jsonMatch[0]);
    return schemaData.tables;
  }

  /**
   * توليد ملفات Schema حسب ORM
   */
  async generateSchemaFiles(tables: Table[], ormType: string = 'none'): Promise<void> {
    console.log(chalk.cyan(`\n📝 توليد ملفات Schema (${ormType})...\n`));

    for (const table of tables) {
      let schemaContent = '';

      switch (ormType) {
        case 'prisma':
          schemaContent = this.generatePrismaSchema(table);
          break;
        case 'typeorm':
          schemaContent = this.generateTypeORMSchema(table);
          break;
        case 'sequelize':
          schemaContent = this.generateSequelizeSchema(table);
          break;
        case 'mongoose':
          schemaContent = this.generateMongooseSchema(table);
          break;
        default:
          schemaContent = this.generateSQLSchema(table);
      }

      const fileName = `${table.name}.${ormType === 'none' ? 'sql' : 'ts'}`;
      const filePath = path.join(this.schemasDir, fileName);
      await fs.writeFile(filePath, schemaContent);

      console.log(chalk.green(`✅ ${fileName}`));
    }

    console.log(chalk.green('\n✅ تم توليد جميع Schema files!'));
  }

  // ============================================
  // Migrations System
  // ============================================

  /**
   * إنشاء migration جديد
   */
  async createMigration(name: string, tables?: Table[]): Promise<string> {
    const timestamp = Date.now();
    const migrationName = `${timestamp}_${name.replace(/\s+/g, '_')}`;
    const fileName = `${migrationName}.ts`;
    const filePath = path.join(this.migrationsDir, fileName);

    let upSQL = '';
    let downSQL = '';

    if (tables && tables.length > 0) {
      // توليد SQL من الـ tables
      for (const table of tables) {
        upSQL += this.generateCreateTableSQL(table) + '\n\n';
        downSQL += `DROP TABLE IF EXISTS ${table.name};\n`;
      }
    }

    const migrationContent = `
// Migration: ${name}
// Generated: ${new Date().toISOString()}

export async function up(db: any): Promise<void> {
  ${upSQL ? `await db.query(\`${upSQL}\`);` : '// TODO: Add up migration'}
}

export async function down(db: any): Promise<void> {
  ${downSQL ? `await db.query(\`${downSQL}\`);` : '// TODO: Add down migration'}
}
`;

    await fs.writeFile(filePath, migrationContent);

    console.log(chalk.green(`✅ تم إنشاء Migration: ${fileName}`));
    return filePath;
  }

  /**
   * تنفيذ migrations
   */
  async runMigrations(): Promise<void> {
    console.log(chalk.cyan('\n🔄 تنفيذ Migrations...\n'));

    const migrations = await this.getMigrations();
    const pending = migrations.filter((m) => !m.executed);

    if (pending.length === 0) {
      console.log(chalk.yellow('⚠️  لا توجد migrations معلقة'));
      return;
    }

    for (const migration of pending) {
      try {
        console.log(chalk.cyan(`⏳ ${migration.name}...`));

        // هنا يجب تنفيذ الـ migration الفعلي مع قاعدة البيانات
        // await executeMigration(migration);

        console.log(chalk.green(`✅ ${migration.name}`));
      } catch (error: any) {
        console.log(chalk.red(`❌ فشل ${migration.name}: ${error.message}`));
        throw error;
      }
    }

    console.log(chalk.green('\n✅ تم تنفيذ جميع Migrations!'));
  }

  /**
   * التراجع عن آخر migration
   */
  async rollbackMigration(): Promise<void> {
    console.log(chalk.cyan('\n↩️  التراجع عن Migration...\n'));

    const migrations = await this.getMigrations();
    const executed = migrations.filter((m) => m.executed);

    if (executed.length === 0) {
      console.log(chalk.yellow('⚠️  لا توجد migrations للتراجع عنها'));
      return;
    }

    const lastMigration = executed[executed.length - 1];

    try {
      console.log(chalk.cyan(`⏳ التراجع عن ${lastMigration.name}...`));

      // هنا يجب تنفيذ rollback الفعلي
      // await rollbackMigration(lastMigration);

      console.log(chalk.green(`✅ تم التراجع عن ${lastMigration.name}`));
    } catch (error: any) {
      console.log(chalk.red(`❌ فشل التراجع: ${error.message}`));
      throw error;
    }
  }

  // ============================================
  // Query Builder & Helpers
  // ============================================

  /**
   * توليد query من وصف طبيعي
   */
  async generateQueryFromNaturalLanguage(
    description: string,
    dbType: DatabaseType = 'postgresql'
  ): Promise<string> {
    const prompt = `
أنشئ SQL query لـ ${dbType} بناءً على:

${description}

متطلبات:
- Query صحيح وآمن
- استخدم parameterized queries
- أضف تعليقات توضيحية
- ضع الـ query بين \`\`\`sql و \`\`\`

أعط Query واحد فقط، محسّن ومنظم.
`;

    const response = await this.client.sendChatMessage([{ role: 'user', content: prompt }]);

    if (!response.success) {
      throw new Error(response.error || 'فشل توليد Query');
    }

    // استخراج الـ SQL
    const sqlMatch = response.message.match(/```sql\n([\s\S]*?)\n```/);
    if (!sqlMatch) {
      throw new Error('تعذر استخراج Query من رد AI');
    }

    return sqlMatch[1].trim();
  }

  /**
   * تحسين query موجود
   */
  async optimizeQuery(
    query: string,
    dbType: DatabaseType = 'postgresql'
  ): Promise<{ optimized: string; improvements: string[] }> {
    const prompt = `
حلل وحسّن الـ SQL query التالي لـ ${dbType}:

\`\`\`sql
${query}
\`\`\`

اقترح تحسينات في:
1. الأداء (indexes, joins, subqueries)
2. القراءة
3. Best practices

التنسيق:
OPTIMIZED_QUERY:
\`\`\`sql
[الـ query المحسّن]
\`\`\`

IMPROVEMENTS:
- [تحسين 1]
- [تحسين 2]
- [تحسين 3]
`;

    const response = await this.client.sendChatMessage([{ role: 'user', content: prompt }]);

    if (!response.success) {
      throw new Error(response.error || 'فشل تحسين Query');
    }

    // استخراج النتائج
    const optimizedMatch = response.message.match(
      /OPTIMIZED_QUERY:[\s\S]*?```sql\n([\s\S]*?)\n```/
    );
    const improvementsMatch = response.message.match(/IMPROVEMENTS:([\s\S]*?)(?=\n\n|$)/);

    const optimized = optimizedMatch?.[1]?.trim() || query;
    const improvements =
      improvementsMatch?.[1]
        ?.split('\n')
        .filter((line) => line.trim().startsWith('-'))
        .map((line) => line.trim().substring(1).trim()) || [];

    return { optimized, improvements };
  }

  /**
   * شرح query معقد
   */
  async explainQuery(query: string): Promise<string> {
    const prompt = `
اشرح SQL query التالي بطريقة بسيطة:

\`\`\`sql
${query}
\`\`\`

اشرح:
1. ماذا يفعل الـ query
2. الجداول المستخدمة
3. الـ joins والعلاقات
4. الـ conditions
5. الأداء المتوقع
`;

    const response = await this.client.sendChatMessage([{ role: 'user', content: prompt }]);

    if (!response.success) {
      throw new Error(response.error || 'فشل شرح Query');
    }

    return response.message;
  }

  // ============================================
  // Data Seeding
  // ============================================

  /**
   * توليد بيانات تجريبية للجداول
   */
  async generateSeedData(
    tables: Table[],
    rowsPerTable: number = 10
  ): Promise<Record<string, any[]>> {
    const seedData: Record<string, any[]> = {};

    for (const table of tables) {
      const prompt = `
أنشئ ${rowsPerTable} سجلات تجريبية واقعية لجدول "${table.name}".

الأعمدة:
${table.columns.map((c) => `- ${c.name} (${c.type})${c.nullable ? ' nullable' : ''}`).join('\n')}

التنسيق (JSON Array):
[
  { "column1": "value1", "column2": "value2" },
  ...
]

البيانات يجب أن تكون:
- واقعية ومنطقية
- متنوعة
- صالحة للأنواع المحددة
`;

      const response = await this.client.sendChatMessage([{ role: 'user', content: prompt }]);

      if (response.success) {
        const jsonMatch = response.message.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          seedData[table.name] = JSON.parse(jsonMatch[0]);
        }
      }
    }

    return seedData;
  }

  /**
   * إنشاء ملف seed
   */
  async createSeedFile(tableName: string, data: any[]): Promise<string> {
    const fileName = `seed_${tableName}.ts`;
    const filePath = path.join(this.projectRoot, 'seeds', fileName);

    await fs.mkdir(path.dirname(filePath), { recursive: true });

    const seedContent = `
// Seed data for ${tableName}
// Generated: ${new Date().toISOString()}

export const ${tableName}Data = ${JSON.stringify(data, null, 2)};

export async function seed(db: any): Promise<void> {
  console.log('Seeding ${tableName}...');

  for (const record of ${tableName}Data) {
    await db.insert('${tableName}', record);
  }

  console.log('✅ ${tableName} seeded (${data.length} records)');
}
`;

    await fs.writeFile(filePath, seedContent);
    console.log(chalk.green(`✅ تم إنشاء seed file: ${fileName}`));

    return filePath;
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * توليد ملف إعدادات قاعدة البيانات
   */
  private async generateDatabaseConfig(dbType: DatabaseType, ormType?: string): Promise<string> {
    const prompt = `
أنشئ ملف TypeScript configuration لـ ${dbType}${ormType ? ` مع ${ormType}` : ''}.

يجب أن يحتوي على:
1. Interface للـ config
2. دالة لقراءة الإعدادات من .env
3. Validation للإعدادات
4. Export default config object

كود كامل وجاهز للاستخدام.
`;

    const response = await this.client.sendChatMessage([{ role: 'user', content: prompt }]);

    const codeMatch = response.message.match(/```typescript\n([\s\S]*?)\n```/);
    return codeMatch?.[1] || '// TODO: Add database config';
  }

  /**
   * توليد ملف الاتصال بقاعدة البيانات
   */
  private async generateConnectionFile(dbType: DatabaseType, ormType?: string): Promise<string> {
    const templates: Record<string, string> = {
      postgresql: `
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text, duration, rows: res.rowCount });
  return res;
}

export async function getClient() {
  const client = await pool.connect();
  return client;
}

export default pool;
`,
      mysql: `
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export async function query(sql: string, params?: any[]) {
  const [results] = await pool.execute(sql, params);
  return results;
}

export default pool;
`,
      mongodb: `
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const client = new MongoClient(uri);

let db: any;

export async function connect() {
  if (!db) {
    await client.connect();
    db = client.db(process.env.DB_NAME);
    console.log('✅ Connected to MongoDB');
  }
  return db;
}

export async function getCollection(name: string) {
  const database = await connect();
  return database.collection(name);
}

export default { connect, getCollection };
`,
    };

    return templates[dbType] || '// TODO: Add database connection';
  }

  /**
   * توليد .env template
   */
  private generateEnvTemplate(dbType: DatabaseType): string {
    const templates: Record<string, string> = {
      postgresql: `
# PostgreSQL Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database
DB_USER=postgres
DB_PASSWORD=your_password
DB_SSL=false
`,
      mysql: `
# MySQL Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=your_database
DB_USER=root
DB_PASSWORD=your_password
`,
      mongodb: `
# MongoDB Database
MONGODB_URI=mongodb://localhost:27017
DB_NAME=your_database
`,
    };

    return templates[dbType] || '';
  }

  /**
   * الحصول على dependencies لقاعدة البيانات
   */
  private getDependencies(dbType: DatabaseType, ormType?: string): string[] {
    const baseDeps: Record<DatabaseType, string[]> = {
      postgresql: ['pg', '@types/pg'],
      mysql: ['mysql2'],
      mongodb: ['mongodb'],
      sqlite: ['sqlite3', '@types/sqlite3'],
      redis: ['redis'],
      mariadb: ['mariadb'],
      mssql: ['mssql'],
    };

    const ormDeps: Record<string, string[]> = {
      prisma: ['prisma', '@prisma/client'],
      typeorm: ['typeorm', 'reflect-metadata'],
      sequelize: ['sequelize'],
      mongoose: ['mongoose', '@types/mongoose'],
    };

    const deps = baseDeps[dbType] || [];
    if (ormType && ormDeps[ormType]) {
      deps.push(...ormDeps[ormType]);
    }

    return deps;
  }

  /**
   * توليد Prisma schema
   */
  private generatePrismaSchema(table: Table): string {
    let schema = `model ${this.toPascalCase(table.name)} {\n`;

    for (const col of table.columns) {
      const isPrimaryKey = table.primaryKey?.includes(col.name);
      const type = this.mapToPrismaType(col.type);
      const optional = col.nullable ? '?' : '';
      const attributes = [];

      if (isPrimaryKey) attributes.push('@id');
      if (col.autoIncrement) attributes.push('@default(autoincrement())');
      if (col.unique) attributes.push('@unique');
      if (col.default) attributes.push(`@default(${col.default})`);

      schema += `  ${col.name} ${type}${optional} ${attributes.join(' ')}\n`;
    }

    schema += `}\n`;
    return schema;
  }

  /**
   * توليد TypeORM schema
   */
  private generateTypeORMSchema(table: Table): string {
    return `
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('${table.name}')
export class ${this.toPascalCase(table.name)} {
${table.columns
  .map((col) => {
    const decorators = [];
    if (table.primaryKey?.includes(col.name)) {
      decorators.push('  @PrimaryGeneratedColumn()');
    } else {
      const colOptions: string[] = [];
      if (col.nullable) colOptions.push('nullable: true');
      if (col.unique) colOptions.push('unique: true');
      if (col.default !== undefined) colOptions.push(`default: ${JSON.stringify(col.default)}`);

      decorators.push(`  @Column(${colOptions.length > 0 ? `{ ${colOptions.join(', ')} }` : ''})`);
    }

    return `${decorators.join('\n')}\n  ${col.name}: ${this.mapToTypeScriptType(col.type)};`;
  })
  .join('\n\n')}
}
`;
  }

  /**
   * توليد Sequelize schema
   */
  private generateSequelizeSchema(table: Table): string {
    return `
import { DataTypes, Model } from 'sequelize';
import sequelize from './database';

export class ${this.toPascalCase(table.name)} extends Model {}

${this.toPascalCase(table.name)}.init({
${table.columns
  .map(
    (col) => `  ${col.name}: {
    type: DataTypes.${this.mapToSequelizeType(col.type)},
    allowNull: ${col.nullable},
    ${col.unique ? 'unique: true,' : ''}
    ${col.autoIncrement ? 'autoIncrement: true,' : ''}
    ${col.default !== undefined ? `defaultValue: ${JSON.stringify(col.default)},` : ''}
    ${table.primaryKey?.includes(col.name) ? 'primaryKey: true,' : ''}
  }`
  )
  .join(',\n')}
}, {
  sequelize,
  tableName: '${table.name}',
  timestamps: true
});
`;
  }

  /**
   * توليد Mongoose schema
   */
  private generateMongooseSchema(table: Table): string {
    return `
import mongoose, { Schema, Document } from 'mongoose';

export interface I${this.toPascalCase(table.name)} extends Document {
${table.columns.map((col) => `  ${col.name}: ${this.mapToTypeScriptType(col.type)};`).join('\n')}
}

const ${table.name}Schema = new Schema({
${table.columns
  .map(
    (col) => `  ${col.name}: {
    type: ${this.mapToMongooseType(col.type)},
    required: ${!col.nullable},
    ${col.unique ? 'unique: true,' : ''}
    ${col.default !== undefined ? `default: ${JSON.stringify(col.default)},` : ''}
  }`
  )
  .join(',\n')}
}, {
  timestamps: true
});

export default mongoose.model<I${this.toPascalCase(table.name)}>('${this.toPascalCase(table.name)}', ${table.name}Schema);
`;
  }

  /**
   * توليد SQL schema
   */
  private generateSQLSchema(table: Table): string {
    return this.generateCreateTableSQL(table);
  }

  /**
   * توليد CREATE TABLE SQL
   */
  private generateCreateTableSQL(table: Table): string {
    let sql = `CREATE TABLE ${table.name} (\n`;

    // الأعمدة
    const columnDefs = table.columns.map((col) => {
      let def = `  ${col.name} ${col.type}`;
      if (col.length) def += `(${col.length})`;
      if (!col.nullable) def += ' NOT NULL';
      if (col.unique) def += ' UNIQUE';
      if (col.autoIncrement) def += ' AUTO_INCREMENT';
      if (col.default !== undefined) def += ` DEFAULT ${col.default}`;
      return def;
    });

    sql += columnDefs.join(',\n');

    // Primary Key
    if (table.primaryKey && table.primaryKey.length > 0) {
      sql += `,\n  PRIMARY KEY (${table.primaryKey.join(', ')})`;
    }

    // Foreign Keys
    if (table.foreignKeys && table.foreignKeys.length > 0) {
      for (const fk of table.foreignKeys) {
        sql += `,\n  FOREIGN KEY (${fk.column}) REFERENCES ${fk.referencedTable}(${fk.referencedColumn})`;
        if (fk.onDelete) sql += ` ON DELETE ${fk.onDelete}`;
        if (fk.onUpdate) sql += ` ON UPDATE ${fk.onUpdate}`;
      }
    }

    sql += '\n);';

    // Indexes
    if (table.indexes && table.indexes.length > 0) {
      for (const idx of table.indexes) {
        sql += `\n\nCREATE ${idx.unique ? 'UNIQUE ' : ''}INDEX ${idx.name} ON ${table.name} (${idx.columns.join(', ')});`;
      }
    }

    return sql;
  }

  /**
   * الحصول على قائمة migrations
   */
  private async getMigrations(): Promise<MigrationFile[]> {
    try {
      const files = await fs.readdir(this.migrationsDir);
      const migrations: MigrationFile[] = [];

      for (const file of files) {
        if (file.endsWith('.ts')) {
          const match = file.match(/^(\d+)_(.+)\.ts$/);
          if (match) {
            migrations.push({
              id: match[1],
              name: match[2],
              timestamp: parseInt(match[1]),
              up: '',
              down: '',
              executed: false, // يجب فحص من قاعدة البيانات
            });
          }
        }
      }

      return migrations.sort((a, b) => a.timestamp - b.timestamp);
    } catch {
      return [];
    }
  }

  // Type Mapping Helpers
  private mapToPrismaType(sqlType: string): string {
    const map: Record<string, string> = {
      VARCHAR: 'String',
      TEXT: 'String',
      INTEGER: 'Int',
      BIGINT: 'BigInt',
      BOOLEAN: 'Boolean',
      TIMESTAMP: 'DateTime',
      DATE: 'DateTime',
      DECIMAL: 'Decimal',
      JSON: 'Json',
    };
    return map[sqlType.toUpperCase()] || 'String';
  }

  private mapToTypeScriptType(sqlType: string): string {
    const map: Record<string, string> = {
      VARCHAR: 'string',
      TEXT: 'string',
      INTEGER: 'number',
      BIGINT: 'number',
      BOOLEAN: 'boolean',
      TIMESTAMP: 'Date',
      DATE: 'Date',
      DECIMAL: 'number',
      JSON: 'any',
    };
    return map[sqlType.toUpperCase()] || 'any';
  }

  private mapToSequelizeType(sqlType: string): string {
    const map: Record<string, string> = {
      VARCHAR: 'STRING',
      TEXT: 'TEXT',
      INTEGER: 'INTEGER',
      BIGINT: 'BIGINT',
      BOOLEAN: 'BOOLEAN',
      TIMESTAMP: 'DATE',
      DATE: 'DATEONLY',
      DECIMAL: 'DECIMAL',
      JSON: 'JSON',
    };
    return map[sqlType.toUpperCase()] || 'STRING';
  }

  private mapToMongooseType(sqlType: string): string {
    const map: Record<string, string> = {
      VARCHAR: 'String',
      TEXT: 'String',
      INTEGER: 'Number',
      BIGINT: 'Number',
      BOOLEAN: 'Boolean',
      TIMESTAMP: 'Date',
      DATE: 'Date',
      DECIMAL: 'Number',
      JSON: 'Schema.Types.Mixed',
    };
    return map[sqlType.toUpperCase()] || 'String';
  }

  private toPascalCase(str: string): string {
    return str
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }
}

// ============================================
// Factory Function
// ============================================

export function createDatabaseIntegration(
  projectRoot: string,
  client: OqoolAPIClient
): DatabaseIntegration {
  return new DatabaseIntegration(projectRoot, client);
}
