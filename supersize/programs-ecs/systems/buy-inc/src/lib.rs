use bolt_lang::*;
use anteroom::Anteroom;
use player::Player;
use anchor_spl::token::{TokenAccount, Transfer};

declare_id!("34Zz6KTjX32fYNAn7j8RTGTi2LcpTxf2K9MAnrGRJ6e6");

#[error_code]
pub enum SupersizeError {
    #[msg("Player already in game.")]
    AlreadyInGame,
    #[msg("Invalid buy in.")]
    InvalidBuyIn,
    #[msg("Invalid game vault.")]
    InvalidGameVault,
    #[msg("Invalid game vault owner.")]
    InvalidGameVaultOwner,
    #[msg("Token mint mismatch.")]
    InvalidMint,
    #[msg("Token decimals not set.")]
    MissingTokenDecimals,
    #[msg("Player component doesn't belong to map.")]
    MapKeyMismatch,
}

#[system]
pub mod buy_inc {

    pub fn execute(ctx: Context<Components>, args: Args) -> Result<Components> {

        let buy_in = args.buyin;
        require!(ctx.accounts.anteroom.map == ctx.accounts.player.map, SupersizeError::MapKeyMismatch);
        require!(ctx.accounts.player.map.is_none(), SupersizeError::AlreadyInGame);
        require!(ctx.accounts.player.score == 0.0, SupersizeError::AlreadyInGame);
        require!(ctx.accounts.player.authority.is_none(), SupersizeError::AlreadyInGame);
        require!(buy_in <= ctx.accounts.anteroom.max_buyin, SupersizeError::InvalidBuyIn);
        require!(buy_in >= ctx.accounts.anteroom.min_buyin, SupersizeError::InvalidBuyIn);
        require!(
            ctx.accounts.anteroom.vault_token_account.expect("Vault token account not set") == ctx.vault_token_account()?.key(),
            SupersizeError::InvalidGameVault
        );

        let vault_token_account: TokenAccount = TokenAccount::try_deserialize_unchecked(
            &mut (ctx.vault_token_account()?.to_account_info().data.borrow()).as_ref()
        )?;

        let exit_pid: Pubkey = pubkey!("HnT1pk8zrLfQ36LjhGXVdG3UgcHQXQdFxdAWK26bw5bS"); 
        let map_pubkey = ctx.accounts.anteroom.map.expect("Expected map key to be set");
        let token_account_owner_pda_seeds = &[b"token_account_owner_pda", map_pubkey.as_ref()];
        let (derived_token_account_owner_pda, _bump) = Pubkey::find_program_address(token_account_owner_pda_seeds, &exit_pid);
        require!(
            derived_token_account_owner_pda == vault_token_account.owner,
            SupersizeError::InvalidGameVaultOwner
        );
        require!(
            vault_token_account.mint == ctx.accounts.anteroom.token.expect("Vault mint not set"),
            SupersizeError::InvalidMint
        );

        let decimals = ctx.accounts.anteroom.token_decimals.ok_or(SupersizeError::MissingTokenDecimals)?;
        let wallet_balance = vault_token_account.amount / 10_u64.pow(decimals);
        let player_payout_account = Some(ctx.payout_token_account()?.key());
        let transfer_instruction = Transfer {
            from: ctx.sender_token_account()?.to_account_info(),
            to: ctx.vault_token_account()?.to_account_info(),
            authority: ctx.signer()?.to_account_info(),
        };
    
        let cpi_ctx = CpiContext::new(
            ctx.token_program()?.to_account_info(),
            transfer_instruction,
        );
        let scale_factor = 10_u64.pow(decimals);
        let transfer_amount = (buy_in * scale_factor as f64).round() as u64;
        anchor_spl::token::transfer(cpi_ctx, transfer_amount)?;

        let player = &mut ctx.accounts.player;
        let authority = *ctx.accounts.authority.key;

        let player_key = Some(authority);
        player.authority = player_key;
        player.payout_token_account = player_payout_account;
        player.buy_in = buy_in;
        player.current_game_wallet_balance = wallet_balance as f64;
        
        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub player: Player,
        pub anteroom: Anteroom,
    }

    #[arguments]
    struct Args {
        buyin: f64,
    }

    #[extra_accounts]
    pub struct ExtraAccounts {
        #[account(mut)]
        vault_token_account: Account<'info, TokenAccount>,
        #[account(mut)]
        sender_token_account: Account<'info, TokenAccount>,
        #[account(mut)]
        payout_token_account: Account<'info, TokenAccount>,
        #[account(mut)]
        signer: Signer<'info>,
        system_program: Program<'info, System>,
        token_program: Program<'info, Token>,
        rent: Sysvar<'info, Rent>,
    }
}
