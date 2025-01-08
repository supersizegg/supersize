use bolt_lang::*;

declare_id!("BEox2GnPkZ1upBAdUi7FVqTstjsC4tDjsbTpTiE17bah");

#[component(delegate)]
pub struct Section {
    pub map: Option<Pubkey>,
    pub top_left_x: u16,
    pub top_left_y: u16,
    #[max_len(100)]
    pub food: Vec<Food>,
}

#[component_deserialize(delegate)]
pub struct Food{
    pub data: [u8; 4]
}

impl Default for Section {
    fn default() -> Self {
        Self::new(SectionInit {
            map: None,
            top_left_x: 0,
            top_left_y: 0,
            food: Vec::new(),
        })
    }
}