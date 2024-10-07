use bolt_lang::*;
use anchor_lang::prelude::*;
use player::Player;
use map::Map;
use section::Section;
use token_vault::cpi::accounts::BalanceAccounts;
use token_vault::cpi::accounts::TransferInAccounts;
use token_vault::program::TokenVault;
use std::f64::consts::E; 
use anchor_spl::token::{Mint, Token, TokenAccount};

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
pub mod join_game {

    pub fn execute(ctx: Context<Components>, args: Args) -> Result<Components> {
        let vault_token_account: TokenAccount = TokenAccount::try_deserialize_unchecked(
            &mut (ctx.vault_token_account()?.to_account_info().data.borrow()).as_ref()
        )?;
        let cpi_program = ctx.token_vault_program()?.to_account_info();
        let cpi_accounts = TransferInAccounts {
            token_account_owner_pda: ctx.token_account_owner_pda()?.to_account_info(),
            vault_token_account: ctx.vault_token_account()?.to_account_info(),
            sender_token_account: ctx.sender_token_account()?.to_account_info(),
            mint_of_token_being_sent: ctx.mint_of_token_being_sent()?.to_account_info(),
            signer: ctx.signer()?.to_account_info(),
            system_program: ctx.system_program()?.to_account_info(),
            token_program: ctx.token_program()?.to_account_info(),
            rent: ctx.rent()?.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token_vault::cpi::transfer_in(cpi_ctx, ctx.accounts.map.entry_fee);

        let map = &mut ctx.accounts.map;
        let section = &mut ctx.accounts.section;
        let section1 = &mut ctx.accounts.section1;
        let section2 = &mut ctx.accounts.section2;
        let section3 = &mut ctx.accounts.section3;
        let player = &mut ctx.accounts.player;
        let authority = *ctx.accounts.authority.key;

        let playername = args.name as String;

        require!(map.players.len() < map.max_players.into(), SupersizeError::GameFull);
        require!(player.authority.is_none(), SupersizeError::AlreadyInGame);
        if map.players.iter().any(|player| *player == authority) {
            return Err(SupersizeError::AlreadyInGame.into());
        }
        
        let mut wallet_balance = 0 as u64;

        if let (Some(token), Some(vault_token_account_check), Some(token_account_owner_pda)) = (
            map.token,
            map.vault_token_account,
            map.token_account_owner_pda,
        ) {
            // If all are present, proceed with the CPI call
            wallet_balance = vault_token_account.amount; //ctx.vault_token_account()?.to_account_info().data;
        }

        let food_unit = map.entry_fee / 100;
        let food_in_wallet = wallet_balance/food_unit;
        let epsilon = 0.01;
        let k = calculate_k(map.max_players as f64, epsilon);
        let y = calculate_y(food_in_wallet as f64, k);
        let mut food_to_add = 35;
        if y > 50.0 {
            food_to_add = y as u16;
        }
        
        let slot = Clock::get()?.slot;
        let xorshift_output = xorshift64(slot);
        let random_shift = (xorshift_output % 13) + 3; 
        let player_x = (xorshift_output % map.width as u64) + 1; 
        let player_y = (xorshift_output % map.height as u64) + 1;
        let player_key = Some(authority);
        player.authority = player_key;
        player.x = player_x as u16;
        player.y = player_y as u16;
        player.target_x = None;
        player.target_y = None;
        player.score = map.entry_fee as f64;
        player.mass = 100;
        player.speed = 6.25;
        player.name = playername;
        
        map.players.push(authority);
        for n in 0..food_to_add {
            let hardvar : u64 = section.food.len() as u64 + n as u64 + 1;
            let mixed_value_food_x = (xorshift_output * (hardvar * 3) + xorshift_output) ^ ((hardvar * 3) << 5);
            let food_x = (mixed_value_food_x % map.width as u64) + 1; 
            let mixed_value_food_y = (xorshift_output * (hardvar * 5) + xorshift_output) ^ ((hardvar * 5) << random_shift);
            let food_y = (mixed_value_food_y % map.height as u64) + 1;
            let newfood = section::Food { x: food_x as u16, y: food_y as u16};
            if section.food.len() < 100 {
                section.food.push(newfood);
            }
            else if section1.food.len() < 100 {
                section1.food.push(newfood);
            }
            else if section2.food.len() < 100 {
                section2.food.push(newfood);
            }
            else if section3.food.len() < 100 {
                section3.food.push(newfood);
            }
            else{
                break;
            }
        }
        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub player: Player,
        pub section: Section,
        pub section1: Section,
        pub section2: Section,
        pub section3: Section,
        pub map: Map,
    }

    #[arguments]
    struct Args {
        name: String,
    }

    #[extra_accounts]
    pub struct ExtraAccounts {
        #[account(mut)]
        token_account_owner_pda: AccountInfo<'info>,
        #[account(mut)]
        vault_token_account: Account<'info, TokenAccount>,
        mint_of_token_being_sent: Account<'info, Mint>,
        #[account(address = TokenVault::id())]  // Ensure it's the correct program
        token_vault_program: Program<'info, TokenVault>,  
        #[account(mut)]
        sender_token_account: Account<'info, TokenAccount>,
        #[account(mut)]
        signer: Signer<'info>,
        system_program: Program<'info, System>,
        token_program: Program<'info, Token>,
        rent: Sysvar<'info, Rent>,
    }
}
