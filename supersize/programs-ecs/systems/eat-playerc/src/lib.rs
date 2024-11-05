use bolt_lang::*;
use player::Player;
use map::Map;

declare_id!("CjuTzhsJNQeQ7hrdT2p5wUizdXUqY4cXBoyPWdQVe1o6");

#[error_code]
pub enum SupersizeError {
    #[msg("Not owner of this player.")]
    NotOwner,
    #[msg("Player not in game.")]
    NotInGame,
    #[msg("Player authority not found.")]
    AuthorityNotFound,
    #[msg("Player just spawned, 5 second invincibility.")]
    JustSpawned,
    #[msg("Component doesn't belong to map.")]
    MapKeyMismatch,
}

#[system]
pub mod eat_playerc {

    pub fn execute(ctx: Context<Components>, _args_p: Vec<u8>) -> Result<Components> {
        let map = &mut ctx.accounts.map;
        let player1 = &mut ctx.accounts.player1;
        let player2 = &mut ctx.accounts.player2;
        let authority = *ctx.accounts.authority.key;

        require!(map.key() == player1.map.expect("player map key not set"), SupersizeError::MapKeyMismatch);
        require!(map.key() == player2.map.expect("player map key not set"), SupersizeError::MapKeyMismatch);

        let player_authority = match player1.authority {
            Some(authority) => authority,  
            None => return Err(SupersizeError::AuthorityNotFound.into()),  
        };
        require!(player_authority == authority, SupersizeError::NotOwner);
        require!(player1.mass != 0, SupersizeError::NotInGame);

        let player2_authority = match player2.authority {
            Some(authority) => authority,  
            None => return Err(SupersizeError::AuthorityNotFound.into()),  
        };
        require!(player2.mass != 0, SupersizeError::NotInGame);

        let current_timestamp = Clock::get()?.unix_timestamp;
        let time_passed : i64 = current_timestamp - player2.join_time;
        require!(time_passed >= 5, SupersizeError::JustSpawned);
        let time_passed_me : i64 = current_timestamp - player1.join_time;
        require!(time_passed_me >= 5, SupersizeError::JustSpawned);
        
        let player_mass = player1.mass as f64 / 10.0;
        let player_radius = 4.0 + player_mass.sqrt() * 6.0;
        let player_x = player1.x;
        let player_y = player1.y;

        if player2_authority != player_authority{
            let dx = (player_x as i16 - player2.x as i16).abs();
            let dy = (player_y as i16 - player2.y as i16).abs();
            if dx < player_radius.ceil() as i16 && dy < player_radius.ceil() as i16 {
                let distance = (((dx as f64).powf(2.0) + (dy as f64).powf(2.0))).sqrt();
                if distance < player_radius && player_mass > player2.mass as f64 * 0.105{

                    player1.score += player2.score;
                    player1.mass = (player1.score * 1000.0 / map.base_buyin as f64).ceil() as u64;

                    map.total_active_buyins = map.total_active_buyins  - player2.buy_in;
                    
                    player2.authority = None;
                    player2.buy_in = 0.0;
                    player2.payout_token_account = None;
                    player2.current_game_wallet_balance = 0.0;
                    player2.x = 50000;
                    player2.y = 50000;
                    player2.target_x = None;
                    player2.target_y = None;
                    player2.score = 0.0;
                    player2.tax = 0.0;
                    player2.mass = 0;
                    player2.speed = 0.0;  
                    player2.join_time = 0; 
                    player2.scheduled_removal_time = None;
                    player2.boost_click_time = None;
                    
                
                }
            }
        }
        
        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub player1: Player,
        pub player2: Player,
        pub map: Map,
    }
}
