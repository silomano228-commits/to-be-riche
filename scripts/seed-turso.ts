// Seed Turso database with admin user and site config
import { createClient } from '@libsql/client'
import { randomUUID } from 'crypto'

const tursoUrl = process.env.TURSO_DATABASE_URL!
const tursoToken = process.env.TURSO_AUTH_TOKEN!

const client = createClient({
  url: tursoUrl,
  authToken: tursoToken,
})

async function seed() {
  console.log('🌱 Seeding Turso database...')

  // Check if admin exists
  const adminCheck = await client.execute({
    sql: "SELECT id FROM User WHERE email = ?",
    args: ['silomano228@gmail.com']
  })

  if (adminCheck.rows.length === 0) {
    // Create admin user
    const adminId = randomUUID()
    await client.execute({
      sql: `INSERT INTO User (id, email, name, password, role, referralCode, emailVerified, balance, investBalance, tradeBalance, projectBalance, hasInvested, depositCount, referralCount, totalProfit, totalLoss) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [adminId, 'silomano228@gmail.com', 'Admin', 'Admin@2024', 'admin', 'BR-ADMIN', 1, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    })
    console.log('✅ Admin user created')
  } else {
    console.log('⚠️ Admin user already exists')
  }

  // Check if SiteConfig exists
  const configCheck = await client.execute({
    sql: "SELECT id FROM SiteConfig WHERE id = ?",
    args: ['main']
  })

  if (configCheck.rows.length === 0) {
    await client.execute({
      sql: `INSERT INTO SiteConfig (id, adminTrxAddress, adminYasAccount, trxUsdPrice, cfaUsdRate) VALUES (?, ?, ?, ?, ?)`,
      args: ['main', '', '', 0.12, 600]
    })
    console.log('✅ SiteConfig created')
  } else {
    console.log('⚠️ SiteConfig already exists')
  }

  // Verify
  const userCount = await client.execute("SELECT COUNT(*) as count FROM User")
  const configCount = await client.execute("SELECT COUNT(*) as count FROM SiteConfig")
  
  console.log(`\n📊 Database stats:`)
  console.log(`  Users: ${userCount.rows[0].count}`)
  console.log(`  SiteConfig: ${configCount.rows[0].count}`)
  console.log('\n🎉 Seed completed!')
}

seed().catch(console.error)
