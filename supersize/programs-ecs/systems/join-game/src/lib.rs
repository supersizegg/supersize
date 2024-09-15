use bolt_lang::*;
use player1::Player1;
use maplite::Maplite;
use section::Section;

declare_id!("AoPSrhHEsHT2XfED7cGCf4zKoGVtXkZQQoLxrVxVL1TG");

#[error_code]
pub enum SupersizeError {
    #[msg("Wallet already in game.")]
    AlreadyInGame,
    #[msg("Game Full.")]
    GameFull,
}

pub fn xorshift64(seed: u64) -> u64 {
    let mut x = seed;
    x ^= x << 13;
    x ^= x >> 7;
    x ^= x << 17;
    x
}

#[system]
pub mod join_name {

    pub fn execute(ctx: Context<Components>, args: Args) -> Result<Components> {
        let map = &mut ctx.accounts.maplite;
        let section = &mut ctx.accounts.section;
        let player1 = &mut ctx.accounts.player1;
        let authority = *ctx.accounts.authority.key;

        let playername = args.name as String;

        require!(map.players.len() < map.max_players.into(), SupersizeError::GameFull);
        require!(player1.authority.is_none(), SupersizeError::AlreadyInGame);
        if map.players.iter().any(|player| *player == authority) {
            return Err(SupersizeError::AlreadyInGame.into());
        }
        //TODO: pay entry fee to wallet
        let slot = Clock::get()?.slot;
        let xorshift_output = xorshift64(slot);
        let random_shift = (xorshift_output % 13) + 3; 
        let player_x = (xorshift_output % map.width as u64) + 1; 
        let player_y = (xorshift_output % map.height as u64) + 1;
        let player_key = Some(authority);
        player1.authority = player_key;
        player1.x = player_x as u16;
        player1.y = player_y as u16;
        player1.target_x = None;
        player1.target_y = None;
        player1.score = map.entry_fee as f64;
        player1.mass = 100;
        player1.speed = 6.25;
        player1.name = playername;
        
        map.players.push(authority);
        if section.food.len() < 100 {
            match map.emit_type {
                maplite::FoodEmit::Flat { value } => {
                    for n in 0..value {
                        let current_food_len = section.food.len();
                        if current_food_len < 100 {
                            let hardvar : u64 = section.food.len() as u64 + n as u64 + 1;
                            let mixed_value_food_x = (xorshift_output * (hardvar * 3) + xorshift_output) ^ ((hardvar * 3) << 5);
                            let food_x = (mixed_value_food_x % map.width as u64) + 1; 
                            let mixed_value_food_y = (xorshift_output * (hardvar * 5) + xorshift_output) ^ ((hardvar * 5) << random_shift);
                            let food_y = (mixed_value_food_y % map.height as u64) + 1;
                            let newfood = section::Food { x: food_x as u16, y: food_y as u16};
                            //how will this react when > max_len? function error or no append?
                            section.food.push(newfood);
                        }
                    }
                }
                maplite::FoodEmit::Curve { percent } => {
                    //TODO
                    // -> v1. get tokens in game wallet, add food proportional to amount
                    msg!("Emit type is Curve with percent: {}", percent);
                }
            }
        }
        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub player1: Player1,
        pub section: Section,
        pub maplite: Maplite,
    }

    #[arguments]
    struct Args {
        name: String,
    }
}
