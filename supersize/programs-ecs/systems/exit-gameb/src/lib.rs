use bolt_lang::*;
use player::Player;
use map::Map;

declare_id!("GuNYSdedUpgh8osyUaZTvSuz5pDNUtQcVeLmEZKDgfCQ");

#[error_code]
pub enum SupersizeError {
    #[msg("Player not in game.")]
    NotInGame,
    #[msg("Component doesn't belong to map.")]
    MapKeyMismatch,
}

#[system]
pub mod exit_gameb {

    pub fn execute(ctx: Context<Components>, _args_p: Vec<u8>) -> Result<Components> {  

        let player = &mut ctx.accounts.player;
        let authority = *ctx.accounts.authority.key;
        let map = &mut ctx.accounts.map;

        require!(player.authority == Some(authority), SupersizeError::NotInGame);
        require!(player.mass != 0, SupersizeError::NotInGame);
        require!(map.key() == player.map.expect("player map key not set"), SupersizeError::MapKeyMismatch);
        
        let current_timestamp = Clock::get()?.unix_timestamp;

        match player.scheduled_removal_time {
            Some(start_time) => {
                let time_passed : i64 = current_timestamp - start_time;
                if time_passed > 5 && time_passed < 10 {

                    if player.tax > player.score{
                        player.score = 0.0;
                        player.authority = None;
                        player.map = None;
                        player.payout_token_account = None;
                    }
                    else{
                        player.score = player.score - player.tax;
                    }
                    map.total_active_buyins = map.total_active_buyins  - player.buy_in;

                    player.mass = 0;
                    player.x = 50000;
                    player.y = 50000;
                    player.target_x = None;
                    player.target_y = None;
                    player.speed = 0.0; 
                    player.buy_in = 0.0;
                    player.current_game_wallet_balance = 0.0; 
                    player.join_time = 0; 
                    player.scheduled_removal_time = None;
                    player.boost_click_time = None; 
                }
                else{
                    player.scheduled_removal_time = None;
                }
            }
            None => {
                player.scheduled_removal_time = Some(current_timestamp);
            }
        }       

        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub player: Player,
        pub map: Map,
    }

}
