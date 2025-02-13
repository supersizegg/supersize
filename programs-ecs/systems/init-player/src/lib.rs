use bolt_lang::*;
use map::Map;
use player::Player;

declare_id!("58N5j49P3u351T6DSFKhPeKwBiXGnXwaYE1nWjtVkRZQ");

#[error_code]
pub enum SupersizeError {
    #[msg("Wallet not authorized.")]
    NotAuthorized,
    #[msg("Authority not found.")]
    AuthorityNotFound,
}

#[system]
pub mod init_player {

    pub fn execute(ctx: Context<Components>, _args_p: Vec<u8>) -> Result<Components> {
        let player = &mut ctx.accounts.player;
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

        player.map = Some(map.key());

        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub player: Player,
        pub map: Map,
    }
}
