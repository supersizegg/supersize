use bolt_lang::*;
use player::Player;
use map::Map;

declare_id!("FmAvFeDZc48YZuKd3p8KDMz76ChCAwAkVJpkVPSTwv17");

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
pub mod eat_player {

    pub fn execute(ctx: Context<Components>, _args_p: Vec<u8>) -> Result<Components> {
        let map = &mut ctx.accounts.map;
        let player1 = &mut ctx.accounts.player1;
        let player2 = &mut ctx.accounts.player2;
        let authority = *ctx.accounts.authority.key;

        let player_mass = player1.mass as f64;
        let player_radius = 4.0 + player_mass.sqrt() * 6.0;
        let player_authority = player1.authority;
        let player_x = player1.x;
        let player_y = player1.y;

        require!(player_authority == Some(authority), SupersizeError::NotOwner);
        if map.players.iter().any(|player| *player == authority) {        
            if player2.authority != player_authority{
                let dx = (player_x as i16 - player2.x as i16).abs();
                let dy = (player_y as i16 - player2.y as i16).abs();
                if dx < player_radius.ceil() as i16 && dy < player_radius.ceil() as i16 {
                    let distance = (((dx as f64).powf(2.0) + (dy as f64).powf(2.0))).sqrt();
                    if distance < player_radius && player_mass > player2.mass as f64 * 1.1{
                        player1.score += player2.score;
                        player1.mass = (player1.score * 100.0 / map.entry_fee as f64).ceil() as u16;

                        if let Some(player2_authority) = player2.authority {
                            if let Some(pos) = map.players.iter().position(|player| *player == player2_authority) {
                                map.players.remove(pos);
                            }
                        }

                        player2.authority = None;
                        player2.x = 50000;
                        player2.y = 50000;
                        player2.target_x = None;
                        player2.target_y = None;
                        player2.score = 0.0;
                        player2.mass = 0;
                        player2.speed = 0.0;  
                    }
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
