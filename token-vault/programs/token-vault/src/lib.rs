use anchor_lang::prelude::*;
use instructions::*;
pub mod instructions;

declare_id!("6KYntX3bwDj7uKmeUddiPaoxkJ19UWdTkQDnitjpFudZ");

#[program]
pub mod token_vault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        initialize::initialize(ctx)
    }

    pub fn get_vault_balance(ctx: Context<BalanceAccounts>) -> Result<u64> {
        balance::get_vault_balance(ctx)
    }

    pub fn transfer_in(ctx: Context<TransferInAccounts>, amount: u64) -> Result<()> {
        send::transfer_in(ctx, amount)
    }

    pub fn transfer_out(ctx: Context<TransferOutAccounts>) -> Result<()> {
        recieve::transfer_out(ctx)
    }
}
