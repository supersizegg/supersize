/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/cash_out.json`.
 */
export type CashOut = {
  "address": "BAP315i1xoAXqbJcTT1LrUS45N3tAQnNnPuNQkCcvbAr",
  "metadata": {
    "name": "cashOut",
    "version": "0.1.10",
    "spec": "0.1.0",
    "description": "Created with Bolt"
  },
  "instructions": [
    {
      "name": "execute2",
      "discriminator": [
        105,
        108,
        50,
        190,
        253,
        180,
        77,
        227
      ],
      "accounts": [
        {
          "name": "player"
        },
        {
          "name": "anteroom"
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "args",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "initExtraAccounts",
      "discriminator": [
        58,
        71,
        119,
        115,
        48,
        174,
        40,
        177
      ],
      "accounts": [
        {
          "name": "vaultTokenAccount",
          "writable": true
        },
        {
          "name": "senderTokenAccount",
          "writable": true
        },
        {
          "name": "gameOwnerTokenAccount",
          "writable": true
        },
        {
          "name": "supersizeTokenAccount",
          "writable": true
        },
        {
          "name": "tokenAccountOwnerPda",
          "writable": true
        },
        {
          "name": "signer",
          "writable": true
        },
        {
          "name": "systemProgram"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "rent"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "anteroom",
      "discriminator": [
        155,
        119,
        131,
        251,
        168,
        75,
        38,
        134
      ]
    },
    {
      "name": "player",
      "discriminator": [
        205,
        222,
        112,
        7,
        165,
        155,
        206,
        218
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "notOwner",
      "msg": "Not owner of this player."
    },
    {
      "code": 6001,
      "name": "stillInGame",
      "msg": "Player still in game."
    },
    {
      "code": 6002,
      "name": "invalidGameVault",
      "msg": "Invalid game vault."
    },
    {
      "code": 6003,
      "name": "invalidPayoutAccount",
      "msg": "Payout account mismatch."
    },
    {
      "code": 6004,
      "name": "invalidPda",
      "msg": "Invalid pda."
    },
    {
      "code": 6005,
      "name": "invalidGameVaultOwner",
      "msg": "Invalid game vault owner."
    },
    {
      "code": 6006,
      "name": "invalidSupersizeTokenAccount",
      "msg": "Invalid supersize payout account."
    },
    {
      "code": 6007,
      "name": "invalidGameOwnerTokenAccount",
      "msg": "Invalid game owner payout account."
    },
    {
      "code": 6008,
      "name": "missingTokenDecimals",
      "msg": "Token decimals not set."
    },
    {
      "code": 6009,
      "name": "invalidMint",
      "msg": "Token mint mismatch."
    },
    {
      "code": 6010,
      "name": "mapKeyMismatch",
      "msg": "Component doesn't belong to map."
    },
    {
      "code": 6011,
      "name": "invalidBuddyLinkProgram",
      "msg": "Invalid Buddy Link Program."
    }
  ],
  "types": [
    {
      "name": "anteroom",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "map",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "baseBuyin",
            "type": "f64"
          },
          {
            "name": "maxBuyin",
            "type": "f64"
          },
          {
            "name": "minBuyin",
            "type": "f64"
          },
          {
            "name": "token",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "tokenDecimals",
            "type": {
              "option": "u32"
            }
          },
          {
            "name": "vaultTokenAccount",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "gamemasterTokenAccount",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "boltMetadata",
            "type": {
              "defined": {
                "name": "boltMetadata"
              }
            }
          }
        ]
      }
    },
    {
      "name": "boltMetadata",
      "docs": [
        "Metadata for the component."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "player",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "authority",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "map",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "buyIn",
            "type": "f64"
          },
          {
            "name": "payoutTokenAccount",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "currentGameWalletBalance",
            "type": "f64"
          },
          {
            "name": "tax",
            "type": "f64"
          },
          {
            "name": "joinTime",
            "type": "i64"
          },
          {
            "name": "x",
            "type": "u16"
          },
          {
            "name": "y",
            "type": "u16"
          },
          {
            "name": "targetX",
            "type": {
              "option": "u16"
            }
          },
          {
            "name": "targetY",
            "type": {
              "option": "u16"
            }
          },
          {
            "name": "score",
            "type": "f64"
          },
          {
            "name": "mass",
            "type": "u64"
          },
          {
            "name": "speed",
            "type": "f32"
          },
          {
            "name": "scheduledRemovalTime",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "boostClickTime",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "boltMetadata",
            "type": {
              "defined": {
                "name": "boltMetadata"
              }
            }
          }
        ]
      }
    }
  ]
};
