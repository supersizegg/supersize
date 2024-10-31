use bolt_lang::*;

declare_id!("Dnh8jDMM6HDY1bXHt55Fi2yKfUPiu4TMhAJiotfb4oHq");

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