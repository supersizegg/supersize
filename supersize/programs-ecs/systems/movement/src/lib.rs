use bolt_lang::*;
use player::Player;
use map::Map;
use section::Section;

declare_id!("Bz7pg5H498CtxfMf9X2oHRknNx8WTn12aNaeh2NwwHzK");

#[error_code]
pub enum SupersizeError {
    #[msg("Wallet not owner of this blob.")]
    NotOwner,
    #[msg("Wallet not in game.")]
    NotInGame,
    #[msg("Player id not found.")]
    AuthorityNotFound,
}

pub fn xorshift64(seed: u64) -> u64 {
    let mut x = seed;
    x ^= x << 13;
    x ^= x >> 7;
    x ^= x << 17;
    x
}

#[system]
pub mod movement {

    pub fn execute(ctx: Context<Components>, args: Args) -> Result<Components> {
        let map = &mut ctx.accounts.map;
        let player = &mut ctx.accounts.player;
        let section = &mut ctx.accounts.section;
        let authority = *ctx.accounts.authority.key;
        
        require!(player.authority == Some(authority), SupersizeError::NotOwner);
        if map.players.iter().any(|player| *player == authority) {

            let target_x = args.x as u16;
            let target_y = args.y as u16;
            let mut boosting = args.boost as bool;

            player.target_x = Some(target_x);
            player.target_y = Some(target_y);

            let player_mass = player.mass as f64;
            let player_radius = 4.0 + player_mass.sqrt() * 6.0; //(player_mass.sqrt()) * 0.5;
            let player_x = player.x;
            let player_y = player.y;
        
            let entry_fee = map.entry_fee as f64;

            let dx = target_x as f64 - player_x as f64;
            let dy = target_y as f64 - player_y as f64;
            let dist = (dx.powf(2.0) + dy.powf(2.0)).sqrt();
            let deg = dy.atan2(dx);
            
            let mut slow_down : f64 = 1.0;
            if player.speed <= 6.25 {
                slow_down = (player.mass as f64/10.0).ln() / 1.504 - 0.531;
            }
            

            if player.mass >= 30 {
                if boosting {
                    player.speed = 12.0;

                    let difference = -player.score * 0.003;
                    player.score = player.score + difference;

                    let steps = ((player.mass as f64 - player.score * 100.0 / entry_fee)).floor() as u16;

                    if steps >= 1 {
                        player.mass = player.mass - steps;
                        let unit_x = dx / dist;
                        let unit_y = dy / dist;
                        if section.food.len() < 100 {
                            for _ in 0..steps {
                                let slot = Clock::get()?.slot;
                                let xorshift_output = xorshift64(slot);
                                let seedx = (xorshift_output % 100 as u64) + 1; 
                                let seedy = (xorshift_output % 100) + 1;
                                let pseudo_random_float_x : f64 = seedx as f64 / 100.0 + 1.2;
                                let pseudo_random_float_y : f64 = seedy as f64 / 100.0 + 1.2;
                                let offset_x = -unit_x * player_radius * pseudo_random_float_x;
                                let offset_y = -unit_y * player_radius * pseudo_random_float_y;
                                let food_x = player_x as i16 + offset_x.round() as i16;
                                let food_y = player_y as i16 + offset_y.round() as i16;
                                
                                let newfood = section::Food { x: (food_x as u16).clamp(0, map.width), y: (food_y as u16).clamp(0, map.height)};
                                section.food.push(newfood);
                        
                            }
                        }
                    }
                }
            } else {
                boosting = false;
            }

            if player.speed > 6.25 && !boosting {
                player.speed -= 0.5;
            }
            
            let delta_y = player.speed as f64 * 3.0 * deg.sin() / slow_down;
            let delta_x = player.speed as f64 * 3.0 * deg.cos() / slow_down; 
            player.y = ((player_y as f64 + delta_y).round() as u16).clamp(0, map.height);
            player.x = ((player_x as f64 + delta_x).round() as u16).clamp(0, map.width);
        }else{
            return Err(SupersizeError::NotInGame.into());
        }
        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub player: Player,
        pub section: Section,
        pub map: Map,
    }

    #[arguments]
    struct Args {
        x: u16,
        y: u16,
        boost: bool,
    }
}

