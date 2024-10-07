use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
pub struct BalanceAccounts<'info> {
    /// CHECK: This is the PDA that owns the token accounts, no validation needed because it is a derived account (PDA)
    #[account(mut,
        seeds=[b"token_account_owner_pda"],
        bump
    )]
    token_account_owner_pda: AccountInfo<'info>,

    #[account(mut,
        seeds=[b"token_vault", mint_of_token_being_sent.key().as_ref()],
        bump,
        token::mint=mint_of_token_being_sent,
        token::authority=token_account_owner_pda,
    )]
    vault_token_account: Account<'info, TokenAccount>,

    mint_of_token_being_sent: Account<'info, Mint>,
}

pub fn get_vault_balance(ctx: Context<BalanceAccounts>) -> Result<u64> {
    let balance = ctx.accounts.vault_token_account.amount;
    msg!("Vault token balance: {}", balance);
    Ok(balance)
}
