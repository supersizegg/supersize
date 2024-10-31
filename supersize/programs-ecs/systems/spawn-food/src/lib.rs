use bolt_lang::*;
use map::Map;
use section::Section;

declare_id!("A3LybrLCJfYL2F1wrBVaaK1rUnhzpMoGD6Lp5VTqEFNG");

#[error_code]
pub enum SupersizeError {
    #[msg("Food component doesn't belong to map.")]
    MapKeyMismatch,
}

pub fn xorshift64(seed: u64) -> u64 {
    let mut x = seed;
    x ^= x << 13;
    x ^= x >> 7;
    x ^= x << 17;
    x
}

#[system]
pub mod spawn_food {

    pub fn execute(ctx: Context<Components>, _args_p: Vec<u8>) -> Result<Components> {
        let map = &mut ctx.accounts.map;
        let section = &mut ctx.accounts.section;

        require!(map.key() == section.map.expect("Section map key not set"), SupersizeError::MapKeyMismatch);

        let queue_len = map.food_queue;
        if let Some(current_food) = map.next_food {
            let newfood = section::Food { x: current_food.x, y: current_food.y};
            section.food.push(newfood);
        }
        if queue_len > 0 {
            let slot = Clock::get()?.slot;
            let xorshift_output = xorshift64(slot);
            let random_shift = (xorshift_output % 13) + 3; 
            let hardvar : u64 = queue_len as u64 + 1;
            let mixed_value_food_x = (xorshift_output * (hardvar * 3) + xorshift_output) ^ ((hardvar * 3) << 5);
            let food_x = (mixed_value_food_x % map.width as u64) + 1; 
            let mixed_value_food_y = (xorshift_output * (hardvar * 5) + xorshift_output) ^ ((hardvar * 5) << random_shift);
            let food_y = (mixed_value_food_y % map.height as u64) + 1;
            let newfood = map::Food { x: food_x as u16, y: food_y as u16};
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
