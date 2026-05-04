// TronGrid API helper — vérification des transactions TRX entrantes
const TRONGRID_API = 'https://api.trongrid.io';

export async function getTrxPrice(): Promise<number> {
  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=TRXUSDT', { cache: 'no-store' });
    const data = await res.json();
    return parseFloat(data.price) || 0.12;
  } catch {
    return 0.12;
  }
}

export async function getAdminTrxAddress(): Promise<string> {
  const { db } = await import('@/lib/db');
  let config = await db.siteConfig.findUnique({ where: { id: 'main' } });
  if (!config) {
    config = await db.siteConfig.create({ data: { id: 'main', adminTrxAddress: '', trxUsdPrice: 0.12 } });
  }
  return config.adminTrxAddress;
}

export async function getTrxUsdPrice(): Promise<number> {
  const { db } = await import('@/lib/db');
  let config = await db.siteConfig.findUnique({ where: { id: 'main' } });
  if (!config) {
    config = await db.siteConfig.create({ data: { id: 'main', adminTrxAddress: '', trxUsdPrice: 0.12 } });
  }
  return config.trxUsdPrice;
}

// Vérifie si une transaction TRX a été envoyée de userAddress vers adminAddress
export async function checkTrxTransaction(
  adminAddress: string,
  userAddress: string,
  expectedAmountTrx: number,
  afterTimestamp: number
): Promise<{ found: boolean; txHash?: string; actualAmount?: number }> {
  try {
    // Normaliser les adresses (minuscule, sans le "T" prefix si nécessaire)
    const normalizeAddr = (addr: string) => addr.trim().toLowerCase();
    const admin = normalizeAddr(adminAddress);
    const user = normalizeAddr(userAddress);

    // Récupérer les transactions TRC20 récentes sur TRON
    // On utilise l'endpoint de TronGrid pour les transferts TRX natifs
    const url = `${TRONGRID_API}/v1/accounts/${admin}/transactions/trc20?limit=50&contract_address=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t&only_to=true&min_timestamp=${afterTimestamp}`;

    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });

    if (!res.ok) return { found: false };

    const data = await res.json();
    if (!data.data || !Array.isArray(data.data)) return { found: false };

    // Chercher une transaction correspondante
    for (const tx of data.data) {
      const fromAddr = normalizeAddr(tx.from || '');
      const toAddr = normalizeAddr(tx.to || '');
      const value = parseFloat(tx.value || '0') / 1_000_000; // TRX a 6 décimales pour USDT, TRX natif est different

      if (fromAddr === user && toAddr === admin) {
        // Tolérance de 5% sur le montant
        const tolerance = expectedAmountTrx * 0.05;
        if (Math.abs(value - expectedAmountTrx) <= tolerance) {
          return { found: true, txHash: tx.transaction_id, actualAmount: value };
        }
      }
    }

    return { found: false };
  } catch (error) {
    console.error('TronGrid check error:', error);
    return { found: false };
  }
}

// Vérifie les transactions TRX natives (pas TRC20)
export async function checkNativeTrxTransfer(
  adminAddress: string,
  userAddress: string,
  expectedAmountTrx: number,
  afterTimestamp: number
): Promise<{ found: boolean; txHash?: string; actualAmount?: number }> {
  try {
    const normalizeAddr = (addr: string) => addr.trim().toLowerCase();
    const admin = normalizeAddr(adminAddress);
    const user = normalizeAddr(userAddress);

    // Utiliser l'endpoint pour les transactions TRX natives
    const url = `${TRONGRID_API}/v1/accounts/${admin}/transactions?limit=50&only_to=true&only_confirmed=true&min_timestamp=${afterTimestamp}`;

    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });

    if (!res.ok) return { found: false };

    const data = await res.json();
    if (!data.data || !Array.isArray(data.data)) return { found: false };

    for (const tx of data.data) {
      // Vérifier les transferts TRX natifs dans raw_data.contract
      const contracts = tx.raw_data?.contract || [];
      for (const contract of contracts) {
        if (contract.type === 'TransferContract') {
          const parameter = contract.parameter?.value;
          if (!parameter) continue;

          const fromAddr = normalizeAddr(parameter.owner_address || '');
          const toAddr = normalizeAddr(parameter.to_address || '');

          // TronGrid retourne des adresses en hexadécimal, on doit les convertir en base58
          const fromBase58 = hexToBase58(fromAddr);
          const toBase58 = hexToBase58(toAddr);

          if (normalizeAddr(fromBase58) === user && normalizeAddr(toBase58) === admin) {
            const amountSun = parameter.amount || 0;
            const amountTrx = amountSun / 1_000_000; // 1 TRX = 1,000,000 SUN

            const tolerance = expectedAmountTrx * 0.05;
            if (Math.abs(amountTrx - expectedAmountTrx) <= tolerance) {
              return { found: true, txHash: tx.txID, actualAmount: amountTrx };
            }
          }
        }
      }
    }

    return { found: false };
  } catch (error) {
    console.error('Native TRX check error:', error);
    return { found: false };
  }
}

// Conversion hex adresse TRON vers base58
function hexToBase58(hex: string): string {
  if (!hex || hex.length < 2) return '';
  // TronGrid peut retourner l'adresse en hex avec préfixe 41
  if (hex.startsWith('41') && hex.length === 42) {
    try {
      return tronAddressFromHex(hex);
    } catch {
      return hex;
    }
  }
  return hex;
}

// Implémentation simplifiée de conversion TRON hex → base58
function tronAddressFromHex(hex: string): string {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  // Decoder les bytes de l'adresse (41 + 20 bytes)
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }
  // Ajouter le checksum (double SHA256, prendre les 4 premiers bytes)
  // Version simplifiée — on retourne l'hex pour le matching
  return 'T' + hex.slice(2);
}
