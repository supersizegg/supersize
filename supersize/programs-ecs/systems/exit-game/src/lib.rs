use bolt_lang::*;
use player::Player;
use players::Players;
use map::Map;

declare_id!("5hVB37dXEFmEvtu2TST8iXAxvd8VXq3JQmGGLNprMVyo");

#[error_code]
pub enum SupersizeError {
    #[msg("Player not in game.")]
    NotInGame,
    #[msg("Player not in given players componenet.")]
    NotInPlayers,
    #[msg("Component doesn't belong to map.")]
    MapKeyMismatch,
}

#[system]
pub mod exit_game {

    pub fn execute(ctx: Context<Components>, _args_p: Vec<u8>) -> Result<Components> {  

        let player = &mut ctx.accounts.player;
        let players = &mut ctx.accounts.players;
        let authority = *ctx.accounts.authority.key;
        let map = &mut ctx.accounts.map;

        require!(player.authority == Some(authority), SupersizeError::NotInGame);
        require!(player.mass != 0, SupersizeError::NotInGame);
        require!(map.key() == player.map.expect("player map key not set"), SupersizeError::MapKeyMismatch);
        require!(map.key() == players.map.expect("players map key not set"), SupersizeError::MapKeyMismatch);

        if !players.playerkeys.iter().any(|key| *key == authority) {
            return Err(SupersizeError::NotInPlayers.into());
        }
        
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

                    if let Some(pos) = players.playerkeys.iter().position(|player| *player == authority) {
                        players.playerkeys.remove(pos);
                    }
                    else{
                        return Err(SupersizeError::NotInPlayers.into());
                    } 
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
        pub players: Players,
    }

}
