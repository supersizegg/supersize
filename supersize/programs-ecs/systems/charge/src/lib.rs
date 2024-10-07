use bolt_lang::*;
use player::Player;
use map::Map;
use section::Section;

declare_id!("2Np1y3UXxnkQR9PgrMfhbK36149ycv9zNTQX8ZHTM5KQ");


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
pub mod charge {

    pub fn execute(ctx: Context<Components>, _args_p: Vec<u8>) -> Result<Components> {
        let map = &mut ctx.accounts.map;
        let player = &mut ctx.accounts.player;
        let section = &mut ctx.accounts.section;
        let authority = *ctx.accounts.authority.key;
        
        require!(player.authority == Some(authority), SupersizeError::NotOwner);
        if map.players.iter().any(|player| *player == authority) {
            let player_mass = player.mass as f64;
            let player_score = player.score as f64;
            let player_x = player.x as f64;
            let player_y = player.y as f64;
            if player_mass >= 30.0 {
                let current_timestamp = Clock::get()?.unix_timestamp;

                match player.charge_start {
                    Some(start_time) => {
                        let mut time_passed : i64 = current_timestamp - start_time;
                        if time_passed > 5 {
                            time_passed = 5;
                        }
        
                        let reduce_by = (time_passed.pow(2) as f64 / 200.0) * player_score;
                        let new_score = player_score - reduce_by;
                        let steps = (player_mass - new_score * 100.0 / map.entry_fee as f64).floor() as u16;
                        let boost_speed : f32 = ((3 + time_passed).pow(2) as f32) / 2.0;
        
                        player.score = new_score;
                        player.mass = player.mass - steps;
                        player.speed = boost_speed;
        
                        let player_radius = 4.0 + player_mass.sqrt() * 6.0;
                        let dx =  player.target_x.unwrap() as f64 - player_x;
                        let dy =  player.target_y.unwrap() as f64 - player_y;
                        let dist = (dx.powf(2.0) + dy.powf(2.0)).sqrt();
                        let unit_x = dx / dist;
                        let unit_y = dy / dist;
                        //potential for lots of steps, too much compute?
                        for n in 0..steps {
                            let current_food_len = section.food.len();
                            if current_food_len < 100 {
                                let slot = Clock::get()?.slot;
                                let xorshift_output = xorshift64(slot);
                                let random_shift = (xorshift_output % 13) + 3; 
                                let hardvar : u64 = section.food.len() as u64 + n as u64 + 1;
                                let mixed_value_food_x = (xorshift_output * (hardvar * 3) + xorshift_output) ^ ((hardvar * 3) << 5);
                                let mixed_value_food_y = (xorshift_output * (hardvar * 5) + xorshift_output) ^ ((hardvar * 5) << random_shift);
                                let seedx = (mixed_value_food_x % 100 as u64) + 1; 
                                let seedy = (mixed_value_food_y % 100) + 1;
                                let pseudo_random_float_x : f64 = ( seedx as f64 / 100.0  * 2.0 ) + 2.0;
                                let pseudo_random_float_y : f64 = ( seedy as f64 / 100.0  * 2.0 ) + 2.0;
                                let offset_x = -unit_x * player_radius * pseudo_random_float_x;
                                let offset_y = -unit_y * player_radius * pseudo_random_float_y;
                                let food_x = player_x as i16 + offset_x.round() as i16;
                                let food_y = player_y as i16 + offset_y.round() as i16;

                                let newfood = section::Food { x: food_x as u16, y: food_y as u16};
                                //how will this react when > max_len? function error or no append?
                                section.food.push(newfood);
                            }
                        }
                        player.charge_start = None;
                    }
                    None => {
                        player.charge_start = Some(current_timestamp);
                    }
                }
            }
        }
        else{
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
}

