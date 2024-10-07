use bolt_lang::*;
use player::Player;
use map::Map;
use std::f64::consts::E; 

declare_id!("FsVq8vDeni8YS5tLSxYvyzkMZGeTrBZaqoS5ruoy5ASx");

#[error_code]
pub enum SupersizeError {
    #[msg("Wallet not in game.")]
    NotInGame,
}

pub fn calculate_k(z: f64, epsilon: f64) -> f64 {
    let numerator = epsilon / (200.0 - 0.6);
    let log_value = numerator.ln(); 
    let k = -log_value / (z * 1000.0); 
    k
}

pub fn calculate_y(x: f64, k: f64) -> f64 {
    let exponent = -(k / 4.0) * x;
    let y = 200.0 - (200.0 - 0.6) * E.powf(exponent);
    y
}

#[system]
pub mod exit_game {

    pub fn execute(ctx: Context<Components>, _args_p: Vec<u8>) -> Result<Components> {
        let player = &mut ctx.accounts.player;
        let authority = *ctx.accounts.authority.key;
        let map = &mut ctx.accounts.map;
        if player.authority == Some(authority) {
            let current_timestamp = Clock::get()?.unix_timestamp;

            match player.scheduled_removal_time {
                Some(start_time) => {
                    let time_passed : i64 = current_timestamp - start_time;
                    if time_passed > 5 && time_passed < 10 {
                        player.authority = None;
                        player.x = 50000;
                        player.y = 50000;
                        player.target_x = None;
                        player.target_y = None;
                        player.speed = 0.0;  
                        //apply tax
                        let wallet_balance = 0;
                        let food_unit = map.entry_fee / 100;
                        let food_in_wallet = wallet_balance/food_unit;
                        let epsilon = 0.01;
                        let k = calculate_k(map.max_players as f64, epsilon);
                        let y = calculate_y(food_in_wallet as f64, k);
                        let mut tax = 35.0;
                        if y > 35.0 {
                            tax = 0.0;
                        }
                        else{
                            tax = tax - y;
                        }
                        player.mass = player.mass - tax as u16;
                        player.score = player.score - tax * (map.entry_fee as f64 / 100.0);
                        if let Some(pos) = map.players.iter().position(|player| *player == authority) {
                            map.players.remove(pos);
                        }
                        else{
                            return Err(SupersizeError::NotInGame.into());
                        } 
                    }
                    else{
                        player.scheduled_removal_time = Some(current_timestamp);
                    }
                }
                None => {
                    player.scheduled_removal_time = Some(current_timestamp);
                }
            }       
        }else{
            return Err(SupersizeError::NotInGame.into()); // Handle the case where no matching authority is found
        };

        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub player: Player,
        pub map: Map,
    }

}

