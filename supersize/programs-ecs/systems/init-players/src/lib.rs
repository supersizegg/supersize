use bolt_lang::*;
use players::Players;
use map::Map;

declare_id!("84UTvkLscZVoznsgC4ppfQ3xSjBxod617g1nwTqEiMLM");

#[error_code]
pub enum SupersizeError {
    #[msg("Wallet not authorized.")]
    NotAuthorized,
    #[msg("Authority not found.")]
    AuthorityNotFound,
}

#[system]
pub mod init_players {

    pub fn execute(ctx: Context<Components>, _args_p: Vec<u8>) -> Result<Components> {
        let players = &mut ctx.accounts.players;
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

        players.map = Some(map.key()); 

        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub players: Players,
        pub map: Map,
    }
}
