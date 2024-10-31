use bolt_lang::*;

declare_id!("DM7jvvNssHqKjKXsSoJjrzAQXp9X8rTCDFskyGAjSXQB");

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
