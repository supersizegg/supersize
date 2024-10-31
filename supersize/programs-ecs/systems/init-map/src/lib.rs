use bolt_lang::*;
use map::Map;

declare_id!("NrQkd31YsAWX6qyuLgktt4VPG4Q2DY94rBq7fWdRgo7");

#[error_code]
pub enum SupersizeError {
    #[msg("Wallet not authorized.")]
    NotAuthorized,
    #[msg("Map settings frozen.")]
    MapFrozen,
    #[msg("Entry fee size not supported.")]
    EntryFeeNotSupported,
    #[msg("Map size not supported.")]
    BadMapSize,
}

#[system]
pub mod init_map {

    pub fn execute(ctx: Context<Components>, args: Args) -> Result<Components> {
        let map = &mut ctx.accounts.map;
        let user_authority = *ctx.accounts.authority.key;

        require!(!map.frozen, SupersizeError::MapFrozen);

        match map.authority {
            Some(authority) => {require!(user_authority == authority, SupersizeError::NotAuthorized);}
            None => {map.authority = Some(user_authority);}
        }

        require!(
            args.size == 4000 || args.size == 6000 || args.size == 10000,
            SupersizeError::BadMapSize
        );

        map.max_players = match args.size {
            4000 => 20,
            6000 => 40,
            10000 => 100,
            _ => return Err(SupersizeError::BadMapSize.into()), 
        };
        
        map.name = args.name;
        map.width = args.size;
        map.height = args.size;
        map.frozen = args.frozen;

        require!(
            args.entry_fee_upper_bound_mul <= 10.0,
            SupersizeError::EntryFeeNotSupported
        );
        require!(
            args.entry_fee_lower_bound_mul <= 100.0,
            SupersizeError::EntryFeeNotSupported
        );
        map.base_buyin = args.entry_fee;
        map.max_buyin = args.entry_fee * args.entry_fee_upper_bound_mul;
        map.min_buyin = args.entry_fee / args.entry_fee_lower_bound_mul;

        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub map: Map,
    }

    #[arguments]
    struct Args {
        name: String,
        size: u16,
        entry_fee: f64,
        entry_fee_upper_bound_mul: f64,
        entry_fee_lower_bound_mul: f64,
        frozen: bool,
    }
}
