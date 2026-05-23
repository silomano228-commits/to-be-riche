// Migrate local SQLite data to Turso
import { createClient } from '@libsql/client'

const tursoUrl = process.env.TURSO_DATABASE_URL!
const tursoToken = process.env.TURSO_AUTH_TOKEN!

const turso = createClient({ url: tursoUrl, authToken: tursoToken })
const local = createClient({ url: 'file:/home/z/my-project/db/custom.db' })

async function migrateTable(table: string, columns: string[]) {
  console.log(`\n📋 Migrating ${table}...`)
  
  const safeTable = table === 'Transaction' ? '"Transaction"' : table
  const localData = await local.execute(`SELECT * FROM ${safeTable}`)
  console.log(`  Found ${localData.rows.length} rows in local DB`)
  
  if (localData.rows.length === 0) {
    console.log(`  ⏭️ No data to migrate`)
    return
  }

  // Check existing data in Turso
  const tursoData = await turso.execute(`SELECT COUNT(*) as count FROM ${safeTable}`)
  const existingCount = Number(tursoData.rows[0].count)
  
  if (existingCount > 0 && table !== 'SiteConfig') {
    console.log(`  ⚠️ Turso already has ${existingCount} rows, skipping to avoid duplicates`)
    return
  }

  const cols = columns.join(', ')
  const placeholders = columns.map(() => '?').join(', ')
  
  let migrated = 0
  for (const row of localData.rows) {
    try {
      const values = columns.map(col => {
        const val = row[col]
        return val === null || val === undefined ? null : String(val)
      })
      
      await turso.execute({
        sql: `INSERT OR IGNORE INTO ${safeTable} (${cols}) VALUES (${placeholders})`,
        args: values as any[]
      })
      migrated++
    } catch (e: any) {
      console.log(`  ❌ Error inserting row: ${e.message?.substring(0, 80)}`)
    }
  }
  
  console.log(`  ✅ Migrated ${migrated}/${localData.rows.length} rows`)
}

async function migrate() {
  console.log('🔄 Migrating local SQLite → Turso...')

  // Get table list from local DB
  const tables = await local.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%' ORDER BY name")
  console.log(`Found ${tables.rows.length} tables: ${tables.rows.map(r => r.name).join(', ')}`)

  await migrateTable('User', ['id', 'email', 'name', 'password', 'balance', 'investBalance', 'tradeBalance', 'projectBalance', 'hasInvested', 'role', 'emailVerified', 'depositCount', 'firstDepositAt', 'lastClaimAt', 'referralCode', 'referredByCode', 'referralCount', 'totalProfit', 'totalLoss', 'createdAt', 'updatedAt'])
  await migrateTable('Transaction', ['id', 'type', 'amount', 'detail', 'userId', 'createdAt'])
  await migrateTable('Investment', ['id', 'userId', 'level', 'amount', 'rate', 'totalCycles', 'doneCycles', 'earned', 'status', 'lastClaimAt', 'nextClaimAt', 'finishesAt', 'createdAt', 'updatedAt'])
  await migrateTable('Trade', ['id', 'userId', 'amount', 'direction', 'durationSec', 'asset', 'result', 'profit', 'entryPrice', 'exitPrice', 'endsAt', 'resolved', 'createdAt', 'updatedAt'])
  await migrateTable('Enterprise', ['id', 'userId', 'name', 'category', 'amount', 'durationDays', 'daysElapsed', 'minReturn', 'maxReturn', 'finalReturn', 'status', 'riskEvents', 'finishesAt', 'createdAt', 'updatedAt'])
  await migrateTable('ChatMessage', ['id', 'userId', 'content', 'isAdmin', 'createdAt'])
  await migrateTable('PendingDeposit', ['id', 'userId', 'amountUsd', 'amountTrx', 'trxPrice', 'userAddress', 'txHash', 'status', 'createdAt', 'updatedAt'])
  await migrateTable('SiteConfig', ['id', 'adminTrxAddress', 'adminYasAccount', 'trxUsdPrice', 'cfaUsdRate', 'updatedAt'])
  await migrateTable('PasswordResetToken', ['id', 'token', 'userId', 'expiresAt', 'used', 'createdAt'])
  await migrateTable('Withdrawal', ['id', 'userId', 'amount', 'trxAddress', 'status', 'adminNote', 'createdAt', 'updatedAt'])
  await migrateTable('OtpCode', ['id', 'email', 'codeHash', 'purpose', 'used', 'expiresAt', 'createdAt'])
  await migrateTable('YasDeposit', ['id', 'userId', 'amountCfa', 'amountUsd', 'amountTrx', 'trxPrice', 'yasAccount', 'trxAddress', 'status', 'adminNote', 'createdAt', 'updatedAt'])

  // Final stats
  console.log('\n📊 Final Turso database stats:')
  for (const table of tables.rows) {
    const safeName = table.name === 'Transaction' ? '"Transaction"' : table.name
    const count = await turso.execute(`SELECT COUNT(*) as count FROM ${safeName}`)
    console.log(`  ${table.name}: ${count.rows[0].count} rows`)
  }

  console.log('\n🎉 Migration completed!')
}

migrate().catch(console.error)
