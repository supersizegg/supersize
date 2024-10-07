use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount, Transfer};
use player::Player;
use map::Map;

#[derive(Accounts)]
pub struct TransferOutAccounts<'info> {
    /// CHECK: This is the PDA that owns the token accounts, no validation needed because it is a derived account (PDA)
    #[account(mut,
        seeds=[b"token_account_owner_pda"],
        bump
    )]
    token_account_owner_pda: AccountInfo<'info>,

    #[account(mut,
        seeds=[b"token_vault", mint_of_token_being_sent.key().as_ref(), map.key().as_ref()],
        bump,
        token::mint=mint_of_token_being_sent,
        token::authority=token_account_owner_pda,
    )]
    vault_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    sender_token_account: Account<'info, TokenAccount>,

    mint_of_token_being_sent: Account<'info, Mint>,

    owner_token_account: Account<'info, TokenAccount>,

    #[account()]
    /// CHECK:`map` is the account that holds the map data
    pub map: AccountInfo<'info>,
    /// CHECK:`player` is the account that holds the player data
    pub player: AccountInfo<'info>,

    #[account(mut)]
    signer: Signer<'info>,
    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    rent: Sysvar<'info, Rent>,
}

pub fn transfer_out(ctx: Context<TransferOutAccounts>) -> Result<()> {
    
    let player = Player::try_deserialize_unchecked(
        &mut &*(*ctx.accounts.player.data.borrow()).as_ref(),
    )?;
    let player_amount = (player.score as u64 * 97) / 100;
    msg!("Token amount transfer out: {}!", player_amount);

    //let map = Map::try_deserialize_unchecked(
    //    &mut &*(*ctx.accounts.map.data.borrow()).as_ref(),
    //)?;
    let owner_amount = (player.score as u64 * 3) / 100;
    msg!("Token amount transfer out: {}!", owner_amount);

    // Below is the actual instruction that we are going to send to the Token program.
    let transfer_instruction = Transfer {
        from: ctx.accounts.vault_token_account.to_account_info(),
        to: ctx.accounts.sender_token_account.to_account_info(),
        authority: ctx.accounts.token_account_owner_pda.to_account_info(),
    };

    let bump = ctx.bumps.token_account_owner_pda;
    let seeds = &[b"token_account_owner_pda".as_ref(), &[bump]];
    let signer = &[&seeds[..]];

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        transfer_instruction,
        signer,
    );

    anchor_spl::token::transfer(cpi_ctx, player_amount)?;

    let transfer_instruction_owner = Transfer {
        from: ctx.accounts.vault_token_account.to_account_info(),
        to: ctx.accounts.owner_token_account.to_account_info(),
        authority: ctx.accounts.token_account_owner_pda.to_account_info(),
    };

    let cpi_ctx_owner = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        transfer_instruction_owner,
        signer,
    );

    anchor_spl::token::transfer(cpi_ctx_owner, player_amount)?;

    Ok(())
}
