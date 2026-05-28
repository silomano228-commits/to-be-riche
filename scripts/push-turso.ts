// Script to push Prisma schema to Turso database + fix missing columns + seed SiteConfig
import { createClient } from '@libsql/client'

const tursoUrl = process.env.TURSO_DATABASE_URL!
const tursoToken = process.env.TURSO_AUTH_TOKEN!

if (!tursoUrl || !tursoToken) {
  console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN')
  process.exit(1)
}

const client = createClient({
  url: tursoUrl,
  authToken: tursoToken,
})

async function pushSchema() {
  console.log('Pushing schema to Turso...')
  
  const tables = [
    `CREATE TABLE IF NOT EXISTS User (
      id TEXT PRIMARY KEY NOT NULL,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      investBalance REAL NOT NULL DEFAULT 0,
      tradeBalance REAL NOT NULL DEFAULT 0,
      projectBalance REAL NOT NULL DEFAULT 0,
      hasInvested BOOLEAN NOT NULL DEFAULT false,
      role TEXT NOT NULL DEFAULT 'user',
      emailVerified BOOLEAN NOT NULL DEFAULT false,
      depositCount INTEGER NOT NULL DEFAULT 0,
      firstDepositAt DATETIME,
      lastClaimAt DATETIME,
      referralCode TEXT NOT NULL UNIQUE,
      referredByCode TEXT,
      referralCount INTEGER NOT NULL DEFAULT 0,
      totalProfit REAL NOT NULL DEFAULT 0,
      totalLoss REAL NOT NULL DEFAULT 0,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS "Transaction" (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      detail TEXT,
      userId TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS Investment (
      id TEXT PRIMARY KEY NOT NULL,
      userId TEXT NOT NULL,
      level INTEGER NOT NULL,
      amount REAL NOT NULL,
      rate REAL NOT NULL,
      totalCycles INTEGER NOT NULL,
      doneCycles INTEGER NOT NULL DEFAULT 0,
      earned REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      lastClaimAt DATETIME,
      nextClaimAt DATETIME,
      finishesAt DATETIME,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS Trade (
      id TEXT PRIMARY KEY NOT NULL,
      userId TEXT NOT NULL,
      amount REAL NOT NULL,
      direction TEXT NOT NULL,
      durationSec INTEGER NOT NULL,
      asset TEXT NOT NULL DEFAULT 'BTC',
      result TEXT,
      profit REAL,
      entryPrice REAL NOT NULL DEFAULT 0,
      exitPrice REAL,
      endsAt DATETIME NOT NULL,
      resolved BOOLEAN NOT NULL DEFAULT false,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS Enterprise (
      id TEXT PRIMARY KEY NOT NULL,
      userId TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      durationDays INTEGER NOT NULL,
      daysElapsed INTEGER NOT NULL DEFAULT 0,
      minReturn REAL NOT NULL,
      maxReturn REAL NOT NULL,
      finalReturn REAL,
      status TEXT NOT NULL DEFAULT 'active',
      riskEvents TEXT,
      finishesAt DATETIME NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS ChatMessage (
      id TEXT PRIMARY KEY NOT NULL,
      userId TEXT NOT NULL,
      content TEXT NOT NULL,
      isAdmin BOOLEAN NOT NULL DEFAULT false,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS PendingDeposit (
      id TEXT PRIMARY KEY NOT NULL,
      userId TEXT NOT NULL,
      amountUsd REAL NOT NULL,
      amountTrx REAL NOT NULL,
      trxPrice REAL NOT NULL,
      userAddress TEXT NOT NULL,
      txHash TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS SiteConfig (
      id TEXT PRIMARY KEY NOT NULL DEFAULT 'main',
      adminTrxAddress TEXT NOT NULL DEFAULT 'TRMJ5R1cKbrMLy19PLu9rVtVGc5Ff2ZrHY',
      adminYasAccount TEXT NOT NULL DEFAULT '90876459',
      trxUsdPrice REAL NOT NULL DEFAULT 0.12,
      cfaUsdRate REAL NOT NULL DEFAULT 600,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS PasswordResetToken (
      id TEXT PRIMARY KEY NOT NULL,
      token TEXT NOT NULL UNIQUE,
      userId TEXT NOT NULL,
      expiresAt DATETIME NOT NULL,
      used BOOLEAN NOT NULL DEFAULT false,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS Withdrawal (
      id TEXT PRIMARY KEY NOT NULL,
      userId TEXT NOT NULL,
      amount REAL NOT NULL,
      amountCfa REAL NOT NULL DEFAULT 0,
      type TEXT NOT NULL DEFAULT 'trx',
      trxAddress TEXT,
      yasAccount TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      adminNote TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS OtpCode (
      id TEXT PRIMARY KEY NOT NULL,
      email TEXT NOT NULL,
      codeHash TEXT NOT NULL,
      purpose TEXT NOT NULL DEFAULT 'email_verification',
      used BOOLEAN NOT NULL DEFAULT false,
      expiresAt DATETIME NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS YasDeposit (
      id TEXT PRIMARY KEY NOT NULL,
      userId TEXT NOT NULL,
      amountCfa REAL NOT NULL DEFAULT 0,
      amountUsd REAL NOT NULL,
      amountTrx REAL NOT NULL,
      trxPrice REAL NOT NULL,
      yasAccount TEXT NOT NULL,
      trxAddress TEXT,
      destination TEXT NOT NULL DEFAULT 'balance',
      status TEXT NOT NULL DEFAULT 'pending',
      adminNote TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    )`,
  ]

  // Create indexes
  const indexes = [
    `CREATE INDEX IF NOT EXISTS Transaction_userId_idx ON "Transaction"(userId)`,
    `CREATE INDEX IF NOT EXISTS Investment_userId_idx ON Investment(userId)`,
    `CREATE INDEX IF NOT EXISTS Trade_userId_idx ON Trade(userId)`,
    `CREATE INDEX IF NOT EXISTS Enterprise_userId_idx ON Enterprise(userId)`,
    `CREATE INDEX IF NOT EXISTS ChatMessage_userId_idx ON ChatMessage(userId)`,
    `CREATE INDEX IF NOT EXISTS PendingDeposit_userId_idx ON PendingDeposit(userId)`,
    `CREATE INDEX IF NOT EXISTS PasswordResetToken_userId_idx ON PasswordResetToken(userId)`,
    `CREATE INDEX IF NOT EXISTS Withdrawal_userId_idx ON Withdrawal(userId)`,
    `CREATE INDEX IF NOT EXISTS YasDeposit_userId_idx ON YasDeposit(userId)`,
    `CREATE INDEX IF NOT EXISTS OtpCode_email_idx ON OtpCode(email)`,
    `CREATE INDEX IF NOT EXISTS User_referralCode_idx ON User(referralCode)`,
    `CREATE INDEX IF NOT EXISTS User_email_idx ON User(email)`,
  ]

  // ALTER TABLE statements for missing columns (safe - ignored if column already exists)
  const alterTables = [
    // Withdrawal: add missing columns from updated schema
    { table: 'Withdrawal', column: 'amountCfa', sql: `ALTER TABLE Withdrawal ADD COLUMN amountCfa REAL NOT NULL DEFAULT 0` },
    { table: 'Withdrawal', column: 'type', sql: `ALTER TABLE Withdrawal ADD COLUMN type TEXT NOT NULL DEFAULT 'trx'` },
    { table: 'Withdrawal', column: 'yasAccount', sql: `ALTER TABLE Withdrawal ADD COLUMN yasAccount TEXT` },
    // YasDeposit: add missing destination column
    { table: 'YasDeposit', column: 'destination', sql: `ALTER TABLE YasDeposit ADD COLUMN destination TEXT NOT NULL DEFAULT 'balance'` },
    { table: 'YasDeposit', column: 'adminNote', sql: `ALTER TABLE YasDeposit ADD COLUMN adminNote TEXT` },
    { table: 'YasDeposit', column: 'trxAddress', sql: `ALTER TABLE YasDeposit ADD COLUMN trxAddress TEXT` },
    // PendingDeposit: add txHash if missing
    // SiteConfig: add adminYasAccount if missing
    { table: 'SiteConfig', column: 'adminYasAccount', sql: `ALTER TABLE SiteConfig ADD COLUMN adminYasAccount TEXT NOT NULL DEFAULT '90876459'` },
    // OtpCode: fix purpose default
  ]

  for (const sql of tables) {
    try {
      await client.execute(sql)
      const tableName = sql.match(/CREATE TABLE IF NOT EXISTS "?(\w+)"?/)?.[1]
      console.log(`✅ Table ${tableName} ensured`)
    } catch (e: any) {
      const tableName = sql.match(/CREATE TABLE IF NOT EXISTS "?(\w+)"?/)?.[1]
      console.log(`⚠️  Table ${tableName}: ${e.message}`)
    }
  }

  // Apply ALTER TABLE for missing columns
  console.log('\n📋 Adding missing columns...')
  for (const alter of alterTables) {
    try {
      await client.execute(alter.sql)
      console.log(`✅ Added column ${alter.table}.${alter.column}`)
    } catch (e: any) {
      if (e.message?.includes('duplicate column name') || e.message?.includes('already exists')) {
        console.log(`⏭️  Column ${alter.table}.${alter.column} already exists`)
      } else {
        console.log(`⚠️  ${alter.table}.${alter.column}: ${e.message}`)
      }
    }
  }

  for (const sql of indexes) {
    try {
      await client.execute(sql)
      const idxName = sql.match(/CREATE INDEX IF NOT EXISTS (\w+)/)?.[1]
      console.log(`✅ Index ${idxName} ensured`)
    } catch (e: any) {
      const idxName = sql.match(/CREATE INDEX IF NOT EXISTS (\w+)/)?.[1]
      console.log(`⚠️  Index ${idxName}: ${e.message}`)
    }
  }

  // Fix SiteConfig: update empty values with proper defaults
  console.log('\n🔧 Fixing SiteConfig values...')
  try {
    await client.execute({
      sql: `UPDATE SiteConfig SET adminTrxAddress = ? WHERE id = 'main' AND (adminTrxAddress IS NULL OR adminTrxAddress = '')`,
      args: ['TRMJ5R1cKbrMLy19PLu9rVtVGc5Ff2ZrHY']
    })
    await client.execute({
      sql: `UPDATE SiteConfig SET adminYasAccount = ? WHERE id = 'main' AND (adminYasAccount IS NULL OR adminYasAccount = '')`,
      args: ['90876459']
    })
    await client.execute({
      sql: `UPDATE SiteConfig SET trxUsdPrice = 0.12 WHERE id = 'main' AND trxUsdPrice = 0`,
    })
    await client.execute({
      sql: `UPDATE SiteConfig SET cfaUsdRate = 600 WHERE id = 'main' AND cfaUsdRate = 0`,
    })
    console.log('✅ SiteConfig values fixed')
  } catch (e: any) {
    console.log(`⚠️  SiteConfig fix: ${e.message}`)
  }

  // Verify SiteConfig
  console.log('\n📋 Current SiteConfig:')
  try {
    const config = await client.execute("SELECT * FROM SiteConfig WHERE id = 'main'")
    for (const row of config.rows) {
      console.log(`  adminTrxAddress: ${row.adminTrxAddress}`)
      console.log(`  adminYasAccount: ${row.adminYasAccount}`)
      console.log(`  trxUsdPrice: ${row.trxUsdPrice}`)
      console.log(`  cfaUsdRate: ${row.cfaUsdRate}`)
    }
  } catch (e: any) {
    console.log(`⚠️  Could not read SiteConfig: ${e.message}`)
  }

  // List all tables
  const result = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
  console.log('\n📋 Tables in Turso database:')
  for (const row of result.rows) {
    console.log(`  - ${row.name}`)
  }

  console.log('\n🎉 Turso schema push completed!')
}

pushSchema().catch(console.error)
