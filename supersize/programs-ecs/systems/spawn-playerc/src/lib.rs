use bolt_lang::*;
use std::f64::consts::E; 
use player::Player;
use map::Map;

declare_id!("7GSaPMeqDopBN2yKX8pSQrNwaajUM1qFZcA6aRitH8LL");


#[error_code]
pub enum SupersizeError {
    #[msg("Player already in game.")]
    AlreadyInGame,
    #[msg("Not owner of this player.")]
    NotOwner,
    #[msg("Player component doesn't belong to map.")]
    MapKeyMismatch,
}

pub fn calculate_k(z: f64, epsilon: f64) -> f64 {
    let numerator = epsilon / (100.0 - 0.6);
    let log_value = numerator.ln(); 
    let k = -log_value / (z * 1000.0); 
    k
}

pub fn calculate_y(x: f64, k: f64) -> f64 {
    let exponent = -(k / 4.0) * x;
    let y = 100.0 - (100.0 - 0.6) * E.powf(exponent);
    y
}

pub fn xorshift64(seed: u64) -> u64 {
    let mut x = seed;
    x ^= x << 13;
    x ^= x >> 7;
    x ^= x << 17;
    x
}

#[system]
pub mod spawn_playerc {

    pub fn execute(ctx: Context<Components>, args: Args) -> Result<Components> {

        let map = &mut ctx.accounts.map;
        let player = &mut ctx.accounts.player;
        let authority = *ctx.accounts.authority.key;

        require!(map.key() == player.map.expect("player map key not set"), SupersizeError::MapKeyMismatch);
        
        require!(player.mass == 0, SupersizeError::AlreadyInGame);
        require!(player.score == 0.0, SupersizeError::AlreadyInGame);
        require!(player.authority == Some(authority), SupersizeError::NotOwner);
        
        let playername = args.name as String;
        let slot = Clock::get()?.slot;
        let xorshift_output = xorshift64(slot);
        let player_x = (xorshift_output % map.width as u64) + 1; 
        let player_y = (xorshift_output % map.height as u64) + 1;
        let player_buyin = player.buy_in;
        let start_mass = 1000.0 / map.base_buyin * player_buyin;
        let wallet_balance = player.current_game_wallet_balance;

        player.name = playername;
        player.x = player_x as u16;
        player.y = player_y as u16;
        player.target_x = None;
        player.target_y = None;
        player.score = player_buyin;
        player.mass = start_mass as u64;
        player.speed = 6.25;
        player.join_time = Clock::get()?.unix_timestamp;

        let mut food_to_add = 100.0;
        let mut player_tax = 100.0;
        let ten_food_unit = map.base_buyin / 100.0;
        let food_in_wallet = (wallet_balance as f64 - map.total_active_buyins) / ten_food_unit;
        let epsilon = 0.01;
        let k = calculate_k(map.max_players as f64, epsilon);
        let y = calculate_y(food_in_wallet as f64, k).floor();
        if y >= 10.0 {
            food_to_add = y * 10.0;
            player_tax = 0.0;
        }else{
            player_tax = player_tax - y * 10.0;
        }
        let mut food_to_add_scaled = food_to_add;
        let mut tax_scaled = (player_tax / 1000.0) * map.base_buyin;
        if player_buyin <= map.base_buyin {
            food_to_add_scaled = food_to_add / map.base_buyin * player_buyin;
            tax_scaled = (player_tax / 1000.0) * player_buyin;
        }

        player.tax = tax_scaled;
        let updated_queue = map.food_queue + food_to_add_scaled as u16;
        map.food_queue = updated_queue;
        map.total_active_buyins = map.total_active_buyins + player_buyin;
                
        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub player: Player,
        pub map: Map,
    }

    #[arguments]
    struct Args {
        name: String,
    }
    
}
