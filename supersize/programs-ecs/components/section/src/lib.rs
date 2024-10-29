use bolt_lang::*;

declare_id!("2D7pVfWpF8NAqBFJQ5FHfMLzQR2wRZk8dRUf5SV1Hw5N");

#[component(delegate)]
pub struct Section {
    pub map: Option<Pubkey>,
    #[max_len(100)]
    pub food: Vec<Food>,
}

#[component_deserialize(delegate)]
pub struct Food{
    pub x: u16,
    pub y: u16,
}

impl Default for Section {
    fn default() -> Self {
        Self::new(SectionInit {
            map: None,
            food: Vec::new(),
        })
    }
}