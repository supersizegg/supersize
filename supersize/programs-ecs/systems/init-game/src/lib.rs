use bolt_lang::*;
use map::Map;

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
pub mod init_game {

    pub fn execute(ctx: Context<Components>, args: Args) -> Result<Components> {
        let map = &mut ctx.accounts.map;
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

        map.vault_token_account = match args.vault_token_account {
            Some(vault_token_account) => Some(vault_token_account as Pubkey),
            None => None,
        };
        map.token = match args.token {
            Some(token) => Some(token as Pubkey),
            None => None,
        };
        map.token_account_owner_pda = match args.token_account_owner_pda {
            Some(token_account_owner_pda) => Some(token_account_owner_pda as Pubkey),
            None => None,
        };

        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub map: Map,
    }

    #[arguments]
    struct Args {
        name: String,
        width: u16,
        height: u16,
        entry_fee: u64,
        max_players: u8,
        vault_token_account: Option<Pubkey>,
        token: Option<Pubkey>,
        token_account_owner_pda: Option<Pubkey>,
        frozen: bool,
    }
}



