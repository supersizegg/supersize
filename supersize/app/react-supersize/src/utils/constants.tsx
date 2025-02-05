import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

export const FOOD_COMPONENT = new PublicKey("BEox2GnPkZ1upBAdUi7FVqTstjsC4tDjsbTpTiE17bah");
export const MAP_COMPONENT = new PublicKey("2dZ5DLJhEVFRA5xRnRD779ojsWsf3HMi6YB1zmVDdsYb");
export const PLAYER_COMPONENT = new PublicKey("2ewyq31Atu7yLcYMg51CEa22HmcCSJwM4jjHH8kKVAJw");
export const ANTEROOM_COMPONENT = new PublicKey("EbGkJPaMY8XCJCNjkWwk971xzE32X5LBPg5s2g4LDYcW");

export const INIT_PLAYER = new PublicKey("58N5j49P3u351T6DSFKhPeKwBiXGnXwaYE1nWjtVkRZQ");
export const INIT_ANTEROOM = new PublicKey("AxmRc9buNLgWVMinrH2WunSxKmdsBXVCghhYZgh2hJT6");
export const INIT_GAME = new PublicKey("NrQkd31YsAWX6qyuLgktt4VPG4Q2DY94rBq7fWdRgo7");
export const EAT_FOOD = new PublicKey("EdLga9mFADH4EjPY6RsG1LF7w8utVuWDgyLVRrA8YzzN");
export const EAT_PLAYER = new PublicKey("F6rDhVKjVTdGKdxEK9UWfFDcxeT3vFbAckX6U2aWeEKZ");
export const JOIN_GAME = new PublicKey("DViN676ajvuWryjWHxk2EF7MvQLgHNqhj4m32p1xLBDB");
export const MOVEMENT = new PublicKey("9rthxrCfneJKfPtv8PQmYk7hGQsUfeyeDKRp3uC4Uwh6");
export const EXIT_GAME = new PublicKey("wdH5MUvXcyKM58yffCxhRQfB5jLQHpnWZhhdYhLCThf");
export const SPAWN_FOOD = new PublicKey("GP3L2w9SP9DASTJoJdTAQFzEZRHprMLaxGovxeMrvMNe");
export const INIT_FOOD = new PublicKey("4euz4ceqv5ugh1x6wZP3BsLNZHqBxQwXcK59psw5KeQw");
export const BUY_IN = new PublicKey("CLC46PuyXnSuZGmUrqkFbAh7WwzQm8aBPjSQ3HMP56kp");
export const CASH_OUT = new PublicKey("BAP315i1xoAXqbJcTT1LrUS45N3tAQnNnPuNQkCcvbAr");

export const SOL_USDC_POOL_ID = "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2";

export const NETWORK = process.env.NODE_ENV === "production" ? "mainnet" : "devnet";

export const RPC_CONNECTION = {
  mainnet: "https://floral-convincing-dawn.solana-mainnet.quiknode.pro/73d5d52678fd227b48dd0aec6a8e94ac9dd61f59",
  devnet: "https://proud-late-lambo.solana-devnet.quiknode.pro/ec12ab7b183190f9cfd274049f6ab83396c22e7d",
};
export const HELIUS_API_KEY = "07a045b7-c535-4d6f-852b-e7290408c937";

export const endpoints = {
  devnet: [
    "https://supersize-fra.magicblock.app",
    "https://supersize.magicblock.app",
    "https://supersize-sin.magicblock.app",
  ],
  mainnet: [
    "https://supersize-mainnet.magicblock.app",
    "https://supersize-mainnet-bos.magicblock.app",
    "https://supersize-mainnet-sin.magicblock.app",
  ],
};

/*
export const endpoints = [
    "https://supersize-mainnet.magicblock.app",
    "https://supersize-mainnet-bos.magicblock.app",
    "https://supersize-mainnet-sin.magicblock.app",
];
*/

/*
export const endpointToWorldMap: Record<string, { worldId: anchor.BN; worldPda: PublicKey }> = {
    "https://supersize-mainnet-sin.magicblock.app": {
        worldId: new anchor.BN(1),
        worldPda: new PublicKey('9LKNh9Ma4WjGUHvohbAAdGpZFNUWmgEQRRgvYwRL25ma'),
    },
    "https://supersize-mainnet-bos.magicblock.app": {
        worldId: new anchor.BN(2),
        worldPda: new PublicKey('5Fj5HJud66muuDyateWdP2HAPkED7CnyApDQBMreVQQH'),
    },
    "https://supersize-mainnet.magicblock.app": {
        worldId: new anchor.BN(3),
        worldPda: new PublicKey('8XG8vqYo1vxURMXuU7RboftYGVWYq11M41HCzHLYzejt'),
    },
}; */

export const activeGamesList: { [key: string]: { worldId: anchor.BN; worldPda: PublicKey; endpoint: string }[] } = {
  devnet: [
    {
      worldId: new anchor.BN(1844),
      worldPda: new PublicKey("2gdDBKF2sTDQq4y44B3prGDsykeCyxdsVa7MeKBkLinw"),
      endpoint: "https://supersize-sin.magicblock.app",
    },
    {
      worldId: new anchor.BN(1848),
      worldPda: new PublicKey("DinogfyiJ8xgNATbbfARTkDuNPv8mbrK8FWNhMCUevKY"),
      endpoint: "https://supersize.magicblock.app",
    },
    {
      worldId: new anchor.BN(1818),
      worldPda: new PublicKey("BMy5QhenuStyAEki6D1wKKAG4LKT1rJaoTWQA5QaYr6F"),
      endpoint: "https://supersize-fra.magicblock.app",
    },
  ],
  mainnet: [
    {
      worldId: new anchor.BN(1),
      worldPda: new PublicKey("9LKNh9Ma4WjGUHvohbAAdGpZFNUWmgEQRRgvYwRL25ma"),
      endpoint: "https://supersize-mainnet-sin.magicblock.app",
    },
    {
      worldId: new anchor.BN(8),
      worldPda: new PublicKey("B8nxHq1NadQKbuaAwow9vHaCty9LcWrYBtD5db216boR"),
      endpoint: "https://supersize-mainnet-sin.magicblock.app",
    },
    {
      worldId: new anchor.BN(10),
      worldPda: new PublicKey("EEwdyjFd7bUupMq8iwxTSrWivQAR5QCVNUZtnqJR54kU"),
      endpoint: "https://supersize-mainnet-sin.magicblock.app",
    },
    {
      worldId: new anchor.BN(2),
      worldPda: new PublicKey("5Fj5HJud66muuDyateWdP2HAPkED7CnyApDQBMreVQQH"),
      endpoint: "https://supersize-mainnet-bos.magicblock.app",
    },
    {
      worldId: new anchor.BN(7),
      worldPda: new PublicKey("9S7BFk4apJ3ZKVYbt7PSWeJY5n3qnsB4AVJWh1ogyo8r"),
      endpoint: "https://supersize-mainnet-bos.magicblock.app",
    },
    {
      worldId: new anchor.BN(9),
      worldPda: new PublicKey("FpMmtdFbUTCVm1irFaX7aKVfe6XxaWt6xb5nYYv3LUER"),
      endpoint: "https://supersize-mainnet-bos.magicblock.app",
    },
    {
      worldId: new anchor.BN(3),
      worldPda: new PublicKey("8XG8vqYo1vxURMXuU7RboftYGVWYq11M41HCzHLYzejt"),
      endpoint: "https://supersize-mainnet.magicblock.app",
    },
    {
      worldId: new anchor.BN(4),
      worldPda: new PublicKey("AGUNzsmCpRp53DPYXY9Yw6Lwg5b5heSkTRyafTkfNYJv"),
      endpoint: "https://supersize-mainnet.magicblock.app",
    },
    {
      worldId: new anchor.BN(11),
      worldPda: new PublicKey("AiS8sVquRX8t17m1ZCi82TqfKVMVvSvUvUibFT9jv33k"),
      endpoint: "https://supersize-mainnet.magicblock.app",
    },
  ],
};

export const options = ["Europe", "America", "Asia"];

export const cachedTokenMetadata: Record<string, { name: string; symbol: string; image: string; network: string }> = {
  "7dnMwS2yE6NE1PX81B9Xpm7zUhFXmQABqUiHHzWXiEBn": {
    name: "Adventure Gold (Wormhole)",
    symbol: "AGLD",
    image: `${process.env.PUBLIC_URL}/agld.jpg`,
    network: "mainnet",
  },
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
    name: "USD Coin",
    symbol: "USDC",
    image: `${process.env.PUBLIC_URL}/usdc.png`,
    network: "mainnet",
  },
  AsoX43Q5Y87RPRGFkkYUvu8CSksD9JXNEqWVGVsr8UEp: {
    name: "Magical Gem",
    symbol: "Magical Gem",
    image: `https://shdw-drive.genesysgo.net/4PMP1MG5vYGkT7gnAMb7E5kqPLLjjDzTiAaZ3xRx5Czd/gem.png`,
    network: "devnet",
  },
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: {
    name: "Bonk",
    symbol: "BONK",
    image: "https://d23exngyjlavgo.cloudfront.net/solana_DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    network: "mainnet",
  },
};

export const API_BASE_URL = "http://localhost:3000/api";
export const scale = 1;
