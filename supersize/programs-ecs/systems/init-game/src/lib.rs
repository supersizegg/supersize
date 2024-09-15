use bolt_lang::*;
use maplite::Maplite;

declare_id!("HX4nb19tA6cDzK52gL6vfP8hpiCuZZNctwmmY3oF1Xzx");

#[error_code]
pub enum SupersizeError {
    #[msg("Wallet not authorized.")]
    NotAuthorized,
    #[msg("Map settings frozen.")]
    MapFrozen,
    #[msg("Game only supports max 100 players.")]
    NotSupported,
}

#[system]
pub mod init_gamelite {

    pub fn execute(ctx: Context<Components>, args: Args) -> Result<Components> {
        let map = &mut ctx.accounts.maplite;
        let user_authority = *ctx.accounts.authority.key;

        require!(!map.settings_frozen, SupersizeError::MapFrozen);

        match map.authority {
            Some(authority) => {require!(user_authority == authority, SupersizeError::NotAuthorized);}
            None => {map.authority = Some(user_authority);}
        }

        let max_players = args.max_players;
        require!(max_players <= 100, SupersizeError::NotSupported);

        map.max_players = max_players;
        map.sections = max_players;
        map.name = args.name;
        map.width = args.width;
        map.height = args.height;
        map.settings_frozen = args.frozen;
        map.entry_fee = args.entry_fee;

        let emit_data = args.emit_data;
        map.emit_type = match args.emit_type {
            0 => maplite::FoodEmit::Flat { value: emit_data  as u16},
            1 => maplite::FoodEmit::Curve { percent: emit_data as f64},
            _ =>  maplite::FoodEmit::Flat { value: emit_data  as u16}, 
        };

        map.game_wallet = match args.game_wallet {
            Some(game_wallet) => Some(game_wallet as Pubkey),
            None => None,
        };
        map.token = match args.token {
            Some(token) => Some(token as Pubkey),
            None => None,
        };

        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub maplite: Maplite,
    }

    #[arguments]
    struct Args {
        name: String,
        width: u16,
        height: u16,
        entry_fee: u64,
        max_players: u8,
        game_wallet: Option<Pubkey>,
        token: Option<Pubkey>,
        emit_type: u8,
        emit_data: f64,
        frozen: bool,
    }
}



