use bolt_lang::*;

declare_id!("FHEY4vtDRd9BiBGR2QpzdB6RYa9Q9s3nhLLmJp55XyVn");

#[component(delegate)]
pub struct Map {
    #[max_len(100)]
    pub name: String,
    pub authority: Option<Pubkey>,
    pub width: u16,
    pub height: u16,
    pub entry_fee: u64,
    pub max_players: u8,
    pub token: Option<Pubkey>,
    pub vault_token_account: Option<Pubkey>,
    pub token_account_owner_pda: Option<Pubkey>,
    pub sections: u8,
    #[max_len(100)]
    pub players: Vec<Pubkey>,
    pub settings_frozen: bool,
}

impl Default for Map {
    fn default() -> Self {
        Self::new(MapInit{
            name: "unnamed game".to_string(),
            authority: None,
            width: 3000,
            height: 3000,
            entry_fee: 100,
            max_players: 10,
            token: None,
            vault_token_account: None,
            token_account_owner_pda: None,
            sections: 10,
            players: Vec::new(),
            settings_frozen: false,
        })
    }
}
