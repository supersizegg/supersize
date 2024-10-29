use bolt_lang::*;

declare_id!("DSjd5Y9zWmfXmnhm9vdzqAR1HvbaTs45ueo15SRsAoUq");

#[component(delegate)]
pub struct Players {
    pub map: Option<Pubkey>,
    #[max_len(10)]
    pub playerkeys: Vec<Pubkey>,
}

impl Default for Players {
    fn default() -> Self {
        Self::new(PlayersInit {
            map: None,
            playerkeys: Vec::new(),
        })
    }
}
