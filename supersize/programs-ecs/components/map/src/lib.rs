use bolt_lang::*;

declare_id!("2dZ5DLJhEVFRA5xRnRD779ojsWsf3HMi6YB1zmVDdsYb");

#[component(delegate)]
pub struct Map {
    #[max_len(100)]
    pub name: String,
    pub authority: Option<Pubkey>,
    pub width: u16,
    pub height: u16,
    pub base_buyin: f64,
    pub max_buyin: f64,
    pub min_buyin: f64,
    pub max_players: u8,
    pub total_active_buyins: f64,
    pub food_queue: u16,
    pub next_food: Option<Food>,
    pub frozen: bool,
}

#[component_deserialize(delegate)]
pub struct Food{
    pub x: u16,
    pub y: u16,
}

impl Default for Map {
    fn default() -> Self {
        Self::new(MapInit{
            name: "ffa".to_string(),
            authority: None,
            width: 4000,
            height: 4000,
            base_buyin: 1000.0,
            max_buyin: 1000.0,
            min_buyin: 1000.0,
            max_players: 20,
            total_active_buyins: 0.0,
            food_queue: 0, 
            next_food: None,
            frozen: false,
        })
    }
}