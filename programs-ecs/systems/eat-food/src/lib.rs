use bolt_lang::*;
use player::Player;
use map::Map;
use section::Section;

declare_id!("EdLga9mFADH4EjPY6RsG1LF7w8utVuWDgyLVRrA8YzzN");

#[error_code]
pub enum SupersizeError {
    #[msg("Not owner of this player.")]
    NotOwner,
    #[msg("Player not in game.")]
    NotInGame,
    #[msg("Component doesn't belong to map.")]
    MapKeyMismatch,
}

pub fn decode_food(data: [u8; 4]) -> (u16, u16, u16) {
    let packed = u32::from_le_bytes(data);
    let x = (packed & 0x3FFF) as u16;          
    let y = ((packed >> 14) & 0x3FFF) as u16;  
    let size = ((packed >> 28) & 0x0F) as u16;    
    (x, y, size)
}

#[system]
pub mod eat_food {

    pub fn execute(ctx: Context<Components>, _args_p: Vec<u8>) -> Result<Components> {
        let map = &mut ctx.accounts.map;
        let section = &mut ctx.accounts.section;
        let player = &mut ctx.accounts.player;
        let authority = *ctx.accounts.authority.key;

        require!(map.key() == player.map.expect("Player map key not set"), SupersizeError::MapKeyMismatch);
        require!(map.key() == section.map.expect("Section map key not set"), SupersizeError::MapKeyMismatch);
        require!(player.mass != 0, SupersizeError::NotInGame);

        let player_mass = player.mass as f64 / 10.0;
        let player_radius : f64 = 4.0 + player_mass.sqrt() * 6.0;
        let player_authority = player.authority;
        let player_x = player.x;
        let player_y = player.y;

        require!(player_authority == Some(authority), SupersizeError::NotOwner);

        section.food.retain(|food| {
                let (decoded_x, decoded_y, decoded_food_value) = decode_food(food.data);
                let dx = (player_x as i16 - decoded_x as i16).abs();
                let dy = (player_y as i16 - decoded_y as i16).abs();
                if dx < player_radius.ceil() as i16 && dy < player_radius.ceil() as i16 {
                    let distance = ((dx as f64).powf(2.0) + (dy as f64).powf(2.0)).sqrt();
                    if distance < player_radius {
                        player.mass += decoded_food_value as u64;
                        player.score += decoded_food_value as f64 * (map.base_buyin as f64 / 1000.0);
                        map.total_food_on_map -= decoded_food_value as u64;
                        false 
                    } else {
                        true
                    }
                } else {
                    true
                }
        });
        
        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub player: Player,
        pub section: Section,
        pub map: Map,
    }
}
