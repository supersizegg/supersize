use bolt_lang::*;
use map::Map;
use section::Section;

declare_id!("4euz4ceqv5ugh1x6wZP3BsLNZHqBxQwXcK59psw5KeQw");

#[error_code]
pub enum SupersizeError {
    #[msg("Wallet not authorized.")]
    NotAuthorized,
    #[msg("Authority not found.")]
    AuthorityNotFound,
}

#[system]
pub mod init_section {

    pub fn execute(ctx: Context<Components>, args: Args) -> Result<Components> {
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
        section.top_left_x = args.top_left_x;
        section.top_left_y = args.top_left_y;

        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub section: Section,
        pub map: Map,
    }

    #[arguments]
    struct Args {
        top_left_x: u16,
        top_left_y: u16,
    }
}
