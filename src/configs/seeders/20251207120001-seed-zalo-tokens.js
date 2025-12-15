import { DataTypes } from "sequelize";

export const up = async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert("zalo_tokens", [
        {
            access_token:
                "aNCJ2N1Hz26GSX46TLx-891y60f-Hfvayn4261P6l7IdDZaG2MQyJxexM60R0laSfdTtBq0iy0R80HPKIcUiAAG_EKyhHgCefIX3H4fApJNH7MeINZsDLVfd72P56QrqmNfC47CitpRNQZvYCH6t7ej916SC9P48abH_NGWupmgn5KrY3sJE2Ue-LtPgGEaQxcrUIqD9m1t6Rr1pM1FdDxzHT6fH4f8dsMmD2JO0kb-Y9GSj05AP0hmy3ImYVAXGp2uzAr1HsMRaSJSl1nU9TeSmB3yoVijIX1yjUG8chHNXTp1ePIwfCkfrAsj8Ax8NzGuHGMv3ass07m0sPtZXH-ya6cnUNAe-kJexOnb9e4ss5ZDWDb69Afif7MTuJvuN_YWvE4C8YbVwP0y5Mo3WTxy5PbyaLiaELs7N5DOUSadq8G",
            refresh_token:
                "Pzq5RYTG75Lct0TX8byML6RI3cqfHn48FCXROdz41IDygbH8N5qh26kfC3DBJNrRUBeV8M0v1Nea-bub92y6IYlaGYykF0PrDEfZ5IK6PbeIx7yxAoC5T3NeGnnpAHfMDTPb2HOS9tLJa4O8IKK5Lsw4O38fQWbJSgDID5mh4Gj-sqj0KYaRBaVRUnPe9JHQRT9C65CRA7D_usr6F18cUWxBTauwFYSF3ROxJ1zgP0uaeWD08snxA3wIAcSGMcm8BinfMZ0zBnynjqLmTLGwCdkA960r2KSK1lGuRa5uVL92WYCq1aDgLno2SMydR3Wa188zQq8FB2W3-d5n7HGpCH6OANWo5Mip0knpJYCyBoyvoIfQTaL0OaAm2GPw9az5QirUAayb6KHindSAE5TskoWD9KWSLG",
            access_token_expires_at: new Date(Date.now() + 3600000), // 1 hour from now
            refresh_token_expires_at: new Date(Date.now() + 7776000000), // 3 tháng từ now
            created_at: new Date(),
            updated_at: new Date(),
        },
    ]);
};

export const down = async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete("zalo_tokens", null, {});
};
