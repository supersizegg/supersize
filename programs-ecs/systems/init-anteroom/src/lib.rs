use anteroom::Anteroom;
use bolt_lang::*;
use map::Map;
use std::str::FromStr;

declare_id!("AxmRc9buNLgWVMinrH2WunSxKmdsBXVCghhYZgh2hJT6");

#[error_code]
pub enum SupersizeError {
    #[msg("Wallet not authorized.")]
    NotAuthorized,
    #[msg("Authority not found.")]
    AuthorityNotFound,
    #[msg("Account not found.")]
    AccountNotFound,
}

#[system]
pub mod init_anteroom {

    pub fn execute(ctx: Context<Components>, args: Args) -> Result<Components> {
        let anteroom = &mut ctx.accounts.anteroom;
        let map = &mut ctx.accounts.map;
        let user_authority = *ctx.accounts.authority.key;

        match map.authority {
            Some(authority) => {
                require!(user_authority == authority, SupersizeError::NotAuthorized);
            }
            None => {
                return Err(SupersizeError::AuthorityNotFound.into());
            }
        }

        anteroom.map = Some(map.key());
        anteroom.base_buyin = map.base_buyin;
        anteroom.max_buyin = map.max_buyin;
        anteroom.min_buyin = map.min_buyin;
        anteroom.token_decimals = args
            .token_decimals
            .map(|token_decimals| token_decimals as u32);
        anteroom.vault_token_account = match args.vault_token_account_string {
            Some(ref vault_token_account_str) => Some(
                Pubkey::from_str(vault_token_account_str)
                    .map_err(|_| SupersizeError::AccountNotFound)?,
            ),
            None => None,
        };
        anteroom.token = match args.token_string {
            Some(ref token_str) => {
                Some(Pubkey::from_str(token_str).map_err(|_| SupersizeError::AccountNotFound)?)
            }
            None => None,
        };
        anteroom.gamemaster_token_account = match args.gamemaster_wallet_string {
            Some(ref gamemaster_wallet_str) => Some(
                Pubkey::from_str(gamemaster_wallet_str)
                    .map_err(|_| SupersizeError::AccountNotFound)?,
            ),
            None => None,
        };

        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub anteroom: Anteroom,
        pub map: Map,
    }

    #[arguments]
    struct Args {
        vault_token_account_string: Option<String>,
        token_string: Option<String>,
        token_decimals: Option<u8>,
        gamemaster_wallet_string: Option<String>,
    }
}
