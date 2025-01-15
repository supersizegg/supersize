/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/init_section.json`.
 */
export type InitSection = {
  "address": "4euz4ceqv5ugh1x6wZP3BsLNZHqBxQwXcK59psw5KeQw",
  "metadata": {
    "name": "initSection",
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
          "name": "section"
        },
        {
          "name": "map"
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
    }
  ],
  "accounts": [
    {
      "name": "map",
      "discriminator": [
        182,
        30,
        142,
        151,
        42,
        241,
        180,
        244
      ]
    },
    {
      "name": "section",
      "discriminator": [
        2,
        85,
        249,
        212,
        33,
        214,
        36,
        179
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "notAuthorized",
      "msg": "Wallet not authorized."
    },
    {
      "code": 6001,
      "name": "authorityNotFound",
      "msg": "Authority not found."
    }
  ],
  "types": [
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
      "name": "map",
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
            "name": "width",
            "type": "u16"
          },
          {
            "name": "height",
            "type": "u16"
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
            "name": "maxPlayers",
            "type": "u8"
          },
          {
            "name": "totalActiveBuyins",
            "type": "f64"
          },
          {
            "name": "totalFoodOnMap",
            "type": "u64"
          },
          {
            "name": "foodQueue",
            "type": "u64"
          },
          {
            "name": "nextFood",
            "type": {
              "option": {
                "defined": {
                  "name": "map::Food"
                }
              }
            }
          },
          {
            "name": "frozen",
            "type": "bool"
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
      "name": "section",
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
            "name": "topLeftX",
            "type": "u16"
          },
          {
            "name": "topLeftY",
            "type": "u16"
          },
          {
            "name": "food",
            "type": {
              "vec": {
                "defined": {
                  "name": "section::Food"
                }
              }
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
      "name": "map::Food",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "data",
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          }
        ]
      }
    },
    {
      "name": "section::Food",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "data",
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          }
        ]
      }
    }
  ]
};
