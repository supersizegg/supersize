use bolt_lang::*;

declare_id!("9tuJnpchAiRpqRadFNW6E6KVguZdRKPSCAkWp8sgSGSu");

#[component(delegate)]
#[derive(Default)]
pub struct Player1 {
    #[max_len(20)]
    pub name: String,
    pub authority: Option<Pubkey>,
    pub x: u16,
    pub y: u16,
    pub target_x: Option<u16>,
    pub target_y: Option<u16>,
    pub score: f64,
    pub mass: u16,
    pub speed: f32,
    pub charge_start: Option<i64>,
}
