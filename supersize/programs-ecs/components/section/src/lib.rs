use bolt_lang::*;

declare_id!("5uea8yPtoiY6F4B4rTtY2y1LJPwLaejjpQrhnDrM6NYL");

#[component(delegate)]
pub struct Section {
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
        Self::new(SectionInit{
            food: Vec::new(),
        })
    }
}
