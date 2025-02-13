use bolt_lang::*;
use anteroom::Anteroom;
use player::Player;
use anchor_spl::token::{TokenAccount, Transfer};
use solana_program::{
    account_info::AccountInfo, 
    program::invoke_signed, 
    pubkey::Pubkey, 
    system_instruction, 
    sysvar::{rent::Rent, Sysvar}
};

declare_id!("CLC46PuyXnSuZGmUrqkFbAh7WwzQm8aBPjSQ3HMP56kp");

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
    #[msg("Given buddy link member account not valid.")]
    InvalidMember,
    #[msg("Given referrer-subsidize account not valid.")]
    InvalidReferrer,
    #[msg("Invalid referral vault owner.")]
    InvalidReferralVaultOwner,
}

#[system]
pub mod buy_in {

    pub fn execute(ctx: Context<Components>, args: Args) -> Result<Components> {

        let mut buy_in = args.buyin;
        require!(ctx.accounts.anteroom.map == ctx.accounts.player.map, SupersizeError::MapKeyMismatch);
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

        let exit_pid: Pubkey = pubkey!("BAP315i1xoAXqbJcTT1LrUS45N3tAQnNnPuNQkCcvbAr"); 
        let map_pubkey = ctx.accounts.anteroom.map.expect("Anteroom map key not set");
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

       if **ctx.refferal_pda_account()?.to_account_info().try_borrow_lamports()? == 0 &&
       (**ctx.buddy_member_pda_account()?.to_account_info().try_borrow_lamports()? > 0){
            let buddy_link_pid: Pubkey = pubkey!("BUDDYtQp7Di1xfojiCSVDksiYLQx511DPdj2nbtG9Yu5");
            let member_name_string = args.member_name.expect("Member name not provided");
            let member_pda_seeds : &[&[u8]] = &[b"member_", b"supersize", b"_", member_name_string.as_bytes()];
            let (derived_member_pda, _bump) = Pubkey::find_program_address(member_pda_seeds, &buddy_link_pid);
            require!(derived_member_pda == ctx.buddy_member_pda_account()?.key(), SupersizeError::InvalidMember);

            /*
            let _ = CpiContext::new(
                ctx.buddy_link_program()?.to_account_info(),
                buddy_link::cpi::ValidateReferrer {
                    buddy_link_program: ctx.buddy_link_program()?.to_account_info(),
                    payer: ctx.signer()?.to_account_info(),
                    authority: ctx.signer()?.to_account_info(),
                    referee_buddy_profile: ctx.referee_buddy_profile()?.to_account_info(),
                    referee_buddy: ctx.referee_buddy()?.to_account_info(),
                    referee_treasury: ctx.referee_treasury()?.to_account_info(),
                    referee_member: ctx.buddy_member_pda_account()?.to_account_info(),
                    referrer_member: Some(ctx.referrer_member()?.to_account_info()),
                    referrer_treasury: Some(ctx.referrer_treasury()?.to_account_info()),
                    referrer_treasury_for_reward: Some(ctx.referrer_treasury_for_reward()?.to_account_info()),
                    referrer_token_account: Some(ctx.referrer_token_account()?.to_account_info()),
                    mint: Some(ctx.mint_of_token()?.to_account_info()),
                },
            );
            */

            let member_key = ctx.buddy_member_pda_account()?.key();
            let token_mint = ctx.accounts.anteroom.token.expect("Vault mint not set"); 
            let referral_pda_seeds = &[b"subsidize", member_key.as_ref(), token_mint.as_ref()];
            let enter_pid: Pubkey = pubkey!("CLC46PuyXnSuZGmUrqkFbAh7WwzQm8aBPjSQ3HMP56kp"); 
            let (derived_referral_pda, refbump) = Pubkey::find_program_address(referral_pda_seeds, &enter_pid);
            require!(derived_referral_pda == ctx.refferal_pda_account()?.key(), SupersizeError::InvalidReferrer);

            let referral_token_account_owner_pda_seeds = &[b"token_account_owner_pda", token_mint.as_ref()];
            let (referral_derived_token_account_owner_pda, bump) = Pubkey::find_program_address(referral_token_account_owner_pda_seeds, &enter_pid);

            let referral_vault_token_account: TokenAccount = TokenAccount::try_deserialize_unchecked(
                &mut (ctx.referral_vault_token_account()?.to_account_info().data.borrow()).as_ref()
            )?;
            require!(
                referral_derived_token_account_owner_pda == referral_vault_token_account.owner,
                SupersizeError::InvalidReferralVaultOwner
            );
            require!(
                referral_vault_token_account.mint == token_mint,
                SupersizeError::InvalidMint
            );
            let referral_vault_balance = referral_vault_token_account.amount / 10_u64.pow(decimals);
        
            if referral_vault_balance > 0 {
                let seeds = &[b"token_account_owner_pda".as_ref(), token_mint.as_ref(), &[bump]];
                let pda_signer = &[&seeds[..]];
                let transfer_instruction = Transfer {
                    from: ctx.referral_vault_token_account()?.to_account_info(),
                    to: ctx.vault_token_account()?.to_account_info(),
                    authority:  ctx.referral_token_account_owner_pda()?.to_account_info(),
                };
            
                let cpi_ctx = CpiContext::new_with_signer(
                    ctx.token_program()?.to_account_info(),
                    transfer_instruction,
                    pda_signer,
                );
                let scale_factor = 10_u64.pow(decimals);
                let transfer_amount = (1.0 * scale_factor as f64).round() as u64;
                anchor_spl::token::transfer(cpi_ctx, transfer_amount)?;

                buy_in = 1.0;

                let rent = Rent::get()?;
                let account_size = 8 + 8;
                let lamports = rent.minimum_balance(account_size);
                let refseeds = &[b"subsidize", member_key.as_ref(), token_mint.as_ref(), &[refbump]];
                invoke_signed(
                    &system_instruction::create_account(
                        &ctx.signer()?.key(),
                        &ctx.refferal_pda_account()?.key(),
                        lamports,
                        account_size as u64,
                        &enter_pid
                    ),
                    &[
                        ctx.signer()?.to_account_info(),
                        ctx.refferal_pda_account()?.to_account_info()
                    ],
                    &[&refseeds[..]]
                )?;
            }
            else{
                let transfer_instruction = Transfer {
                    from: ctx.payout_token_account()?.to_account_info(),
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
            }
        }
        else{ 
            let transfer_instruction = Transfer {
                from: ctx.payout_token_account()?.to_account_info(),
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
        }

        let player_authority = Some(ctx.player_account()?.key());
        let player = &mut ctx.accounts.player;
        
        player.authority = player_authority;
        player.payout_token_account = player_payout_account;
        player.buy_in = buy_in;
        player.current_game_wallet_balance = wallet_balance as f64;
        player.join_time = Clock::get()?.unix_timestamp;

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
        member_name: Option<String>,
    }

    #[extra_accounts]
    pub struct ExtraAccounts {
        #[account(mut)]
        vault_token_account: Account<'info, TokenAccount>,
        #[account(mut)]
        player_account: Account<'info, TokenAccount>,
        #[account(mut)]
        payout_token_account: Account<'info, TokenAccount>,
        #[account(mut)]
        referral_vault_token_account: Account<'info, TokenAccount>,
        #[account(mut)]
        referral_token_account_owner_pda: AccountInfo<'info>,
        #[account(mut)]
        refferal_pda_account: AccountInfo<'info>,
        #[account(mut)]
        buddy_member_pda_account: AccountInfo<'info>,
        /*
        #[account(mut)]
        referee_buddy: Option<AccountInfo<'info>>,
        #[account(mut)]
        referee_buddy_profile: Option<AccountInfo<'info>>,
        #[account(mut)]
        referrer_token_account: Option<AccountInfo<'info, TokenAccount>>,
        #[account(mut)]
        referee_treasury: Option<AccountInfo<'info>>,
        #[account(mut)]
        referrer_treasury_for_reward: Option<AccountInfo<'info>>,
        #[account(mut)]
        referrer_treasury: Option<AccountInfo<'info>>,
        #[account(mut)]
        referrer_member: Option<AccountInfo<'info>>,
        #[account()]
        mint_of_token: Option<Account<'info, Mint>>,
        #[account()]
        buddy_link_program: Option<UncheckedAccount<'info>>, */
        #[account(mut)]
        signer: Signer<'info>,
        system_program: Program<'info, System>,
        token_program: Program<'info, Token>,
        rent: Sysvar<'info, Rent>,
    }
}