use bolt_lang::*;
use section::Section;
use map::Map;

declare_id!("6vFNtK3uopAUxJ4AhXbsfKyb9JZPkKnPvkFXEpUwNSEc");

#[error_code]
pub enum SupersizeError {
    #[msg("Wallet not authorized.")]
    NotAuthorized,
    #[msg("Authority not found.")]
    AuthorityNotFound,
}

#[system]
pub mod init_section {

    pub fn execute(ctx: Context<Components>, _args_p: Vec<u8>) -> Result<Components> {
        let section = &mut ctx.accounts.section;
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

        section.map = Some(map.key()); 

        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub section: Section,
        pub map: Map,
    }
}
