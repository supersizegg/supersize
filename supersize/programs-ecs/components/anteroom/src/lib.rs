use bolt_lang::*;

declare_id!("6PWyQF9YxtQLCZeYtJhPftVg4qXv2pHGyT5NteJVjacJ");

#[component]
pub struct Anteroom {
    pub map: Option<Pubkey>,
    pub base_buyin: f64,
    pub max_buyin: f64,
    pub min_buyin: f64,
    pub token: Option<Pubkey>,
    pub token_decimals: Option<u32>,
    pub vault_token_account: Option<Pubkey>,
    pub gamemaster_token_account: Option<Pubkey>,
}

impl Default for Anteroom {
    fn default() -> Self {
        Self::new(AnteroomInit {
            map: None,
            base_buyin: 1000.0,
            max_buyin: 1000.0,
            min_buyin: 1000.0,
            token: None,
            token_decimals: None,
            vault_token_account: None,
            gamemaster_token_account: None,
        })
    }
}
