use bolt_lang::*;

declare_id!("FHEY4vtDRd9BiBGR2QpzdB6RYa9Q9s3nhLLmJp55XyVn");


#[component(delegate)]
pub struct Maplite {
    #[max_len(100)]
    pub name: String,
    pub authority: Option<Pubkey>,
    pub width: u16,
    pub height: u16,
    pub entry_fee: u64,
    pub max_players: u8,
    pub token: Option<Pubkey>,
    pub game_wallet: Option<Pubkey>,
    pub sections: u8,
    #[max_len(100)]
    pub players: Vec<Pubkey>,
    pub emit_type: FoodEmit,
    pub settings_frozen: bool,
}

#[component_deserialize(delegate)]
pub enum FoodEmit {
    Flat { value: u16 },
    Curve { percent: f64 },
}

impl Default for Maplite {
    fn default() -> Self {
        Self::new(MapliteInit{
            name: "unnamed game".to_string(),
            authority: None,
            width: 3000,
            height: 3000,
            entry_fee: 100,
            max_players: 10,
            token: None,
            game_wallet: None,
            sections: 10,
            players: Vec::new(),
            emit_type: FoodEmit::Flat { value: 40 },
            settings_frozen: false,
        })
    }
}
