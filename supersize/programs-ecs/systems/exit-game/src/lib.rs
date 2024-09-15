use bolt_lang::*;
use player1::Player1;
use maplite::Maplite;

declare_id!("FsVq8vDeni8YS5tLSxYvyzkMZGeTrBZaqoS5ruoy5ASx");

#[error_code]
pub enum SupersizeError {
    #[msg("Wallet not in game.")]
    NotInGame,
}

#[system]
pub mod exit_lite {

    pub fn execute(ctx: Context<Components>, _args_p: Vec<u8>) -> Result<Components> {
        let player1 = &mut ctx.accounts.player1;
        let authority = *ctx.accounts.authority.key;
        let map = &mut ctx.accounts.maplite;
        if player1.authority == Some(authority) {
            player1.authority = None;
            player1.x = 50000;
            player1.y = 50000;
            player1.target_x = None;
            player1.target_y = None;
            player1.score = 0.0;
            player1.mass = 0;
            player1.speed = 0.0;  
            if let Some(pos) = map.players.iter().position(|player| *player == authority) {
                map.players.remove(pos);
                //TODO: transfer score in token to user
            }
            else{
                return Err(SupersizeError::NotInGame.into());
            }        
        }else{
            return Err(SupersizeError::NotInGame.into()); // Handle the case where no matching authority is found
        };

        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub player1: Player1,
        pub maplite: Maplite,
    }

}

