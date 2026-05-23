// Socket notification utility - uses HTTP endpoint to chat service instead of socket.io-client
// This avoids the heavy socket.io-client dependency that causes Turbopack compilation issues

interface WithdrawalNotification {
  withdrawalId: string;
  type: 'trx' | 'yas';
  userId: string;
  userName: string;
  amount: number;
  amountCfa?: number;
  yasAccount?: string;
  trxAddress?: string;
}

/**
 * Notify admin about a new withdrawal via the chat service HTTP endpoint
 * This is non-blocking and won't affect the API response time
 */
export function notifyWithdrawal(data: WithdrawalNotification): void {
  // Fire and forget - don't await, don't block
  fetch('http://localhost:3003/notify-withdrawal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).catch(() => {
    // Chat service might be down, that's OK
  });
}
