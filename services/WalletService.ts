// services/WalletService.ts - Shared across Masir apps
import { supabase } from '../supabase/client';

export interface WalletTransaction {
  id: string;
  type: 'commission_deduct' | 'topup' | 'withdrawal';
  amount: number;
  timestamp: string;
}

export const WalletService = {
  // Deduct 9% commission on ride/food completion
  async deductCommission(serviceType: string, fare: number): Promise<boolean> {
    const commission = fare * 0.09; // 9% for Afghanistan
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance_afn')
      .eq('user_id', 'current_user_id') // Replace with actual user ID
      .single();

    if (!wallet || wallet.balance_afn < commission) {
      alert(`Low balance! Need ${commission} AFN commission. Top up at nearest agent.`);
      return false;
    }

    // Deduct commission
    const { error } = await supabase
      .from('wallets')
      .update({ balance_afn: wallet.balance_afn - commission })
      .eq('user_id', 'current_user_id');

    if (!error) {
      // Log transaction
      await supabase.from('transactions').insert({
        wallet_id: wallet.id,
        type: 'commission_deduct',
        amount: commission,
        notes: `${serviceType} fare: ${fare} AFN`
      });
      return true;
    }
    return false;
  },

  // Top up wallet via cash agent
  async topUpWallet(amount: number, agentCode: string): Promise<boolean> {
    // Verify agent code (mock for now)
    if (!agentCode.startsWith('AFG')) {
      alert('Invalid agent code. Visit authorized Masir agent.');
      return false;
    }

    const { error } = await supabase
      .from('wallets')
      .update({ balance_afn: supabase.raw('balance_afn + ?', [amount]) })
      .eq('user_id', 'current_user_id');

    if (!error) {
      await supabase.from('transactions').insert({
        type: 'topup',
        amount,
        notes: `Cash top-up via agent ${agentCode}`
      });
      alert(`Top-up successful! +${amount} AFN`);
      return true;
    }
    return false;
  }
};
Add WalletService for 9% commission system
