use anchor_spl::token::{TokenAccount, Transfer};
use anteroom::Anteroom;
use bolt_lang::*;
use player::Player;

declare_id!("BAP315i1xoAXqbJcTT1LrUS45N3tAQnNnPuNQkCcvbAr");

#[error_code]
pub enum SupersizeError {
    #[msg("Not owner of this player.")]
    NotOwner,
    #[msg("Player still in game.")]
    StillInGame,
    #[msg("Invalid game vault.")]
    InvalidGameVault,
    #[msg("Payout account mismatch.")]
    InvalidPayoutAccount,
    #[msg("Invalid pda.")]
    InvalidPda,
    #[msg("Invalid game vault owner.")]
    InvalidGameVaultOwner,
    #[msg("Invalid supersize payout account.")]
    InvalidSupersizeTokenAccount,
    #[msg("Invalid game owner payout account.")]
    InvalidGameOwnerTokenAccount,
    #[msg("Token decimals not set.")]
    MissingTokenDecimals,
    #[msg("Token mint mismatch.")]
    InvalidMint,
    #[msg("Component doesn't belong to map.")]
    MapKeyMismatch,
    #[msg("Invalid Buddy Link Program.")]
    InvalidBuddyLinkProgram,
}

pub fn get_amounts(final_score: f64, is_referred: bool) -> (f64, f64, f64, f64) {
    if is_referred {
        (
            (final_score * 98.0) / 100.0,
            (final_score * 0.9) / 100.0,
            (final_score * 0.9) / 100.0,
            (final_score * 0.2) / 100.0,
        )
    } else {
        (
            (final_score * 98.0) / 100.0,
            (final_score * 1.0) / 100.0,
            (final_score * 1.0) / 100.0,
            0f64,
        )
    }
}

pub const BUDDY_LINK_PROGRAM_ID: &str = "BUDDYtQp7Di1xfojiCSVDksiYLQx511DPdj2nbtG9Yu5";

#[system]
pub mod cash_out {

    pub fn execute(ctx: Context<Components>, args: Args) -> Result<Components> {
        let _authority = *ctx.accounts.authority.key;

        //require!(ctx.accounts.player.authority == Some(authority), SupersizeError::NotOwner);
        require!(
            ctx.accounts.player.map == ctx.accounts.anteroom.map,
            SupersizeError::MapKeyMismatch
        );
        require!(ctx.accounts.player.mass == 0, SupersizeError::StillInGame);

        let _player_token_account: TokenAccount = TokenAccount::try_deserialize_unchecked(
            &mut (ctx.sender_token_account()?.to_account_info().data.borrow()).as_ref(),
        )?;
        /*require!(
            player_token_account.owner == authority,
            SupersizeError::NotOwner
        );*/
        require!(
            ctx.sender_token_account()?.key()
                == ctx
                    .accounts
                    .player
                    .payout_token_account
                    .expect("Player payout account not set"),
            SupersizeError::InvalidPayoutAccount
        );
        require!(
            ctx.accounts
                .anteroom
                .vault_token_account
                .expect("Vault token account not set")
                == ctx.vault_token_account()?.key(),
            SupersizeError::InvalidGameVault
        );

        let vault_token_account: TokenAccount = TokenAccount::try_deserialize_unchecked(
            &mut (ctx.vault_token_account()?.to_account_info().data.borrow()).as_ref(),
        )?;
        let exit_pid: Pubkey = pubkey!("BAP315i1xoAXqbJcTT1LrUS45N3tAQnNnPuNQkCcvbAr");
        let map_pubkey = ctx.accounts.anteroom.map.expect("Anteroom map key not set");
        let token_account_owner_pda_seeds = &[b"token_account_owner_pda", map_pubkey.as_ref()];
        let (derived_token_account_owner_pda, bump) =
            Pubkey::find_program_address(token_account_owner_pda_seeds, &exit_pid);

        require!(
            derived_token_account_owner_pda == ctx.token_account_owner_pda()?.key(),
            SupersizeError::InvalidPda
        );
        require!(
            derived_token_account_owner_pda == vault_token_account.owner,
            SupersizeError::InvalidGameVaultOwner
        );
        require!(
            vault_token_account.mint == ctx.accounts.anteroom.token.expect("Vault mint not set"),
            SupersizeError::InvalidMint
        );

        let supersize_parent_account: Pubkey =
            pubkey!("DdGB1EpmshJvCq48W1LvB1csrDnC4uataLnQbUVhp6XB");
        let supersize_token_account: TokenAccount = TokenAccount::try_deserialize_unchecked(
            &mut (ctx
                .supersize_token_account()?
                .to_account_info()
                .data
                .borrow())
            .as_ref(),
        )?;
        require!(
            supersize_parent_account == supersize_token_account.owner,
            SupersizeError::InvalidSupersizeTokenAccount
        );
        require!(
            ctx.game_owner_token_account()?.key()
                == ctx
                    .accounts
                    .anteroom
                    .gamemaster_token_account
                    .expect("Game owner token account not set"),
            SupersizeError::InvalidGameOwnerTokenAccount
        );

        let seeds = &[
            b"token_account_owner_pda".as_ref(),
            map_pubkey.as_ref(),
            &[bump],
        ];
        let pda_signer = &[&seeds[..]];

        let decimals = ctx
            .accounts
            .anteroom
            .token_decimals
            .ok_or(SupersizeError::MissingTokenDecimals)?;
        let scale_factor = 10_u64.pow(decimals);
        let final_score = ctx.accounts.player.score;
        /*
        let player_amount = (final_score * 98.0) / 100.0;
        let game_owner_amount = (final_score * 1.0) / 100.0;
        let supersize_amount = (final_score * 1.0) / 100.0;
        let scaled_final_score = (player_amount * scale_factor as f64).round() as u64;
        let scaled_game_owner_amount = (game_owner_amount * scale_factor as f64).round() as u64;
        let scaled_supersize_amount = (supersize_amount * scale_factor as f64).round() as u64;
        */

        let (player_amount, game_owner_amount, supersize_amount, referrer_amount) =
            get_amounts(final_score, args.referred);

        let (
            scaled_final_score,
            scaled_game_owner_amount,
            scaled_supersize_amount,
            _scaled_referrer_amount,
        ) = (
            (player_amount * scale_factor as f64).round() as u64,
            (game_owner_amount * scale_factor as f64).round() as u64,
            (supersize_amount * scale_factor as f64).round() as u64,
            (referrer_amount * scale_factor as f64).round() as u64,
        );

        let transfer_instruction_player = Transfer {
            from: ctx.vault_token_account()?.to_account_info(),
            to: ctx.sender_token_account()?.to_account_info(),
            authority: ctx.token_account_owner_pda()?.to_account_info(),
        };

        let cpi_ctx_player = CpiContext::new_with_signer(
            ctx.token_program()?.to_account_info(),
            transfer_instruction_player,
            pda_signer,
        );

        let transfer_instruction_owner = Transfer {
            from: ctx.vault_token_account()?.to_account_info(),
            to: ctx.game_owner_token_account()?.to_account_info(),
            authority: ctx.token_account_owner_pda()?.to_account_info(),
        };

        let cpi_ctx_owner = CpiContext::new_with_signer(
            ctx.token_program()?.to_account_info(),
            transfer_instruction_owner,
            pda_signer,
        );

        let transfer_instruction_supersize = Transfer {
            from: ctx.vault_token_account()?.to_account_info(),
            to: ctx.supersize_token_account()?.to_account_info(),
            authority: ctx.token_account_owner_pda()?.to_account_info(),
        };

        let cpi_ctx_supersize = CpiContext::new_with_signer(
            ctx.token_program()?.to_account_info(),
            transfer_instruction_supersize,
            pda_signer,
        );
        anchor_spl::token::transfer(cpi_ctx_player, scaled_final_score)?;
        anchor_spl::token::transfer(cpi_ctx_owner, scaled_game_owner_amount)?;
        anchor_spl::token::transfer(cpi_ctx_supersize, scaled_supersize_amount)?;

        /*
        if scaled_referrer_amount > 0 {
            let buddy_link_pid = Pubkey::from_str(BUDDY_LINK_PROGRAM_ID).unwrap();
            require!(ctx.buddy_link_program()?.key() == buddy_link_pid, SupersizeError::InvalidBuddyLinkProgram);

            let cpi_context = CpiContext::new(
                ctx.buddy_link_program()?.to_account_info(),
                buddy_link::cpi::TransferCheckedGlobalOnlyReward {
                    buddy_link_program: ctx.buddy_link_program()?.to_account_info(),
                    authority: ctx.signer()?.to_account_info(),
                    system_program: Some(ctx.system_program()?.to_account_info()),
                    mint:  Some(ctx.mint_of_token()?.to_account_info()),
                    token_program: Some(ctx.token_program()?.to_account_info()),
                    from_token_account: Some(ctx.vault_token_account()?.to_account_info()),
                    referrer_token_account: Some(ctx.referrer_token_account()?.to_account_info()),
                    global_referrer_treasury: ctx.global_referrer_treasury()?.to_account_info(),
                    global_referrer_treasury_for_reward: ctx.global_referrer_treasury_for_reward()?.to_account_info(),
                    referee_buddy_profile: ctx.referee_buddy_profile()?.to_account_info(),
                    referee_buddy: ctx.referee_buddy()?.to_account_info(),
                },
            );

            let _ = buddy_link::cpi::transfer_checked_global_only_reward(
                cpi_context,
                scaled_referrer_amount,
                & [],
            );
        } */

        let player = &mut ctx.accounts.player;
        player.score = 0.0;
        player.tax = 0.0;
        player.authority = None;
        player.payout_token_account = None;

        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub player: Player,
        pub anteroom: Anteroom,
    }

    #[arguments]
    struct Args {
        referred: bool,
    }

    #[extra_accounts]
    pub struct ExtraAccounts {
        #[account(mut)]
        vault_token_account: Account<'info, TokenAccount>,
        #[account(mut)]
        sender_token_account: Account<'info, TokenAccount>,
        #[account(mut)]
        game_owner_token_account: Account<'info, TokenAccount>,
        #[account(mut)]
        supersize_token_account: Account<'info, TokenAccount>,
        #[account(mut)]
        token_account_owner_pda: AccountInfo<'info>,
        /*
        #[account(mut)]
        referee_buddy: Option<AccountInfo<'info>>,
        #[account(mut)]
        referee_buddy_profile: Option<AccountInfo<'info>>,
        #[account(mut)]
        referrer_token_account: Option<AccountInfo<'info, TokenAccount>>,
        #[account(mut)]
        global_referrer_treasury: Option<AccountInfo<'info>>,
        #[account(mut)]
        global_referrer_treasury_for_reward: Option<AccountInfo<'info>>,
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
