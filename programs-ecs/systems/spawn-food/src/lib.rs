use bolt_lang::*;
use map::Map;
use section::Section;

declare_id!("GP3L2w9SP9DASTJoJdTAQFzEZRHprMLaxGovxeMrvMNe");

#[error_code]
pub enum SupersizeError {
    #[msg("Food component doesn't belong to map.")]
    MapKeyMismatch,
    #[msg("Food not in section provided.")]
    FoodOutOfBounds,
}

pub fn xorshift64(seed: u64) -> u64 {
    let mut x = seed;
    x ^= x << 13;
    x ^= x >> 7;
    x ^= x << 17;
    x
}

pub fn encode_food(x: u16, y: u16, food_value: u16) -> [u8; 4] {
    assert!(x < 16_384, "x out of range");
    assert!(y < 16_384, "y out of range");
    assert!(food_value < 16, "z out of range");

    let packed = ((food_value as u32) << 28) | ((y as u32) << 14) | (x as u32);
     
    packed.to_le_bytes()
}

pub fn decode_food(data: [u8; 4]) -> (u16, u16, u16) {
    let packed = u32::from_le_bytes(data);
    let x = (packed & 0x3FFF) as u16;          
    let y = ((packed >> 14) & 0x3FFF) as u16;  
    let size = ((packed >> 28) & 0x0F) as u16;    
    (x, y, size)
}

#[system]
pub mod spawn_food {

    pub fn execute(ctx: Context<Components>, _args_p: Vec<u8>) -> Result<Components> {
        let map = &mut ctx.accounts.map;
        let section = &mut ctx.accounts.section;

        require!(map.key() == section.map.expect("Section map key not set"), SupersizeError::MapKeyMismatch);

        let queue_len = map.food_queue;
        if let Some(current_food) = map.next_food {
            let (decoded_x, decoded_y, _decoded_food_value) = decode_food(current_food.data);
            require!(
                decoded_x >= section.top_left_x &&
                decoded_x < section.top_left_x + 1000 &&
                decoded_y >= section.top_left_y &&
                decoded_y < section.top_left_y + 1000,
                SupersizeError::FoodOutOfBounds
            );
            if section.food.len() < 100 {
                let newfood = section::Food { data: current_food.data };
                section.food.push(newfood);
                map.total_food_on_map += 1;
            }else{
                map.food_queue = queue_len + 1;
            }
        }
        if queue_len > 0 {
            let slot = Clock::get()?.slot;
            let xorshift_output = xorshift64(slot);
            let hardvar : u64 = queue_len + 1;
            let random_shift = (xorshift_output % 13) + 3; 
            let mixed_value_food_x = (xorshift_output.wrapping_mul(hardvar * 3).wrapping_add(xorshift_output)) ^ (hardvar * 3).wrapping_shl(5);
            let mixed_value_food_y = (xorshift_output.wrapping_mul(hardvar * 5).wrapping_add(xorshift_output)) ^ (hardvar * 5).wrapping_shl(random_shift as u32);
            let food_x = mixed_value_food_x % map.width as u64;
            let food_y = mixed_value_food_y % map.height as u64;
            let clamped_food_x = (food_x as u16).clamp(0, map.width - 1);
            let clamped_food_y = (food_y as u16).clamp(0, map.height - 1);
            let encoded_data = encode_food(clamped_food_x, clamped_food_y, 1);
            let newfood = map::Food { data: encoded_data};
            map.next_food = Some(newfood);
            map.food_queue = queue_len - 1;
        }else{
            map.next_food = None;
        }
        
        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub map: Map,
        pub section: Section,
    }

}
