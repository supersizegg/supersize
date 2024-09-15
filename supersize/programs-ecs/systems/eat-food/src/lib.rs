use bolt_lang::*;
use player1::Player1;
use maplite::Maplite;
use section::Section;

declare_id!("J1FvadCtRdRdW6hk9UhJbDick7cju2v5sBwPRT42pK3e");

#[error_code]
pub enum SupersizeError {
    #[msg("Wallet not owner of this blob.")]
    NotOwner,
    #[msg("Wallet not in game.")]
    NotInGame,
    #[msg("Player id not found.")]
    AuthorityNotFound,
}

#[system]
pub mod eat_food {

    pub fn execute(ctx: Context<Components>, _args_p: Vec<u8>) -> Result<Components> {
        let map = &mut ctx.accounts.maplite;
        let section = &mut ctx.accounts.section;
        let player1 = &mut ctx.accounts.player1;
        let authority = *ctx.accounts.authority.key;

        let player_mass = player1.mass as f64;
        let player_radius = 4.0 + player_mass.sqrt() * 6.0;
        let player_authority = player1.authority;
        let player_x = player1.x;
        let player_y = player1.y;

        require!(player_authority == Some(authority), SupersizeError::NotOwner);
        if map.players.iter().any(|player| *player == authority) {
            section.food.retain(|food| {
                //if args.positions.contains(&(food.x, food.y)) {
                    let dx = (player_x as i16 - food.x as i16).abs();
                    let dy = (player_y as i16 - food.y as i16).abs();
                    if dx < player_radius.ceil() as i16 && dy < player_radius.ceil() as i16 {
                        let distance = ((dx as f64).powf(2.0) + (dy as f64).powf(2.0)).sqrt();
                        if distance < player_radius {
                            player1.mass += 1;
                            player1.score += map.entry_fee as f64 / 100.0;
                            false 
                        } else {
                            true
                        }
                    } else {
                        true
                    }
                //} else {
                //    true
                //}
            });
        }
        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub player1: Player1,
        pub section: Section,
        pub maplite: Maplite,
    }

    //#[arguments]
    //pub struct Args {
    //    pub positions: Vec<(u16, u16)>,
    //}
}

